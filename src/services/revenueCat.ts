import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import type { SubscriptionTier } from '../contexts/AuthContext';
import { firestore } from './firebase';
import { subscriptionPlans, type SubscriptionPlan, type SubscriptionPlanId } from './subscriptionPlans';

export const REVENUECAT_ENTITLEMENT_ID = 'TradersEdge Elite';

export type RevenueCatPackageMap = Partial<Record<SubscriptionPlanId, PurchasesPackage>>;

let configuredAppUserId: string | null = null;

export function getRevenueCatApiKey() {
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  }) || '';
}

export async function configureRevenueCatForUser(appUserId: string) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return false;

  const isConfigured = await Purchases.isConfigured().catch(() => false);

  if (!isConfigured) {
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => undefined);
    }
    Purchases.configure({ apiKey, appUserID: appUserId });
    configuredAppUserId = appUserId;
    return true;
  }

  const currentAppUserId = await Purchases.getAppUserID().catch(() => configuredAppUserId);
  if (currentAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
  }

  configuredAppUserId = appUserId;
  return true;
}

export async function fetchCurrentOffering() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export function getPackageMapFromOffering(offering: PurchasesOffering | null): RevenueCatPackageMap {
  if (!offering) return {};

  const planEntries = subscriptionPlans.map((plan) => {
    const storePackage = getPackageForPlan(offering, plan);
    return storePackage ? [plan.id, storePackage] : null;
  });

  return Object.fromEntries(planEntries.filter(Boolean) as Array<[SubscriptionPlanId, PurchasesPackage]>);
}

export function getPackageForPlan(offering: PurchasesOffering, plan: SubscriptionPlan) {
  const directMatch = offering.availablePackages.find((candidate) => candidate.product.identifier === plan.productId);
  if (directMatch) return directMatch;

  switch (plan.id) {
    case 'pro_monthly':
      return offering.monthly;
    case 'pro_annual':
      return offering.annual;
    case 'pro_lifetime':
      return offering.lifetime;
    default:
      return null;
  }
}

export async function purchaseRevenueCatPackage(storePackage: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(storePackage);
  return customerInfo;
}

export async function restoreRevenueCatPurchases() {
  return Purchases.restorePurchases();
}

export async function getRevenueCatCustomerInfo() {
  return Purchases.getCustomerInfo();
}

export function isRevenueCatPurchaseCancelled(error: unknown) {
  const purchasesError = error as Partial<PurchasesError>;
  return (
    purchasesError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    purchasesError.userCancelled === true
  );
}

export function getRevenueCatSubscriptionTier(customerInfo: CustomerInfo): SubscriptionTier {
  const entitlement = customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
  if (!entitlement) return 'free';

  const plan = subscriptionPlans.find((candidate) => candidate.productId === entitlement.productIdentifier);
  if (plan?.id === 'pro_lifetime' || entitlement.expirationDate == null) {
    return 'lifetime';
  }

  return 'pro';
}

export async function syncRevenueCatCustomerInfoToProfile(
  userId: string,
  customerInfo: CustomerInfo,
  options: { currentTier?: SubscriptionTier; currentProvider?: string | null } = {},
) {
  const entitlement = customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID];

  if (entitlement) {
    await updateDoc(doc(firestore, 'users', userId), {
      revenueCatAppUserId: customerInfo.originalAppUserId,
      revenueCatEntitlementId: entitlement.identifier,
      revenueCatManagementUrl: customerInfo.managementURL || null,
      revenueCatProductId: entitlement.productIdentifier,
      subscriptionProvider: 'revenuecat',
      subscriptionProductId: entitlement.productIdentifier,
      subscriptionTier: getRevenueCatSubscriptionTier(customerInfo),
      subscriptionUpdatedAt: serverTimestamp(),
    });
    return;
  }

  if (
    options.currentProvider === 'revenuecat' &&
    (options.currentTier === 'pro' || options.currentTier === 'lifetime')
  ) {
    await updateDoc(doc(firestore, 'users', userId), {
      revenueCatManagementUrl: customerInfo.managementURL || null,
      subscriptionTier: 'free',
      subscriptionUpdatedAt: serverTimestamp(),
    });
  }
}

export function addRevenueCatCustomerInfoListener(
  listener: (customerInfo: CustomerInfo) => void,
) {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
