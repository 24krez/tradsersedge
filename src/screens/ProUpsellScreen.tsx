import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { TraderIcon, traderEdgeIcons } from '../components/TraderIcon';
import { subscriptionPaywallCopy, subscriptionPlans, termsOfUseUrl } from '../services/subscriptionPlans';
import {
  configureRevenueCatForUser,
  fetchCurrentOffering,
  getPackageMapFromOffering,
  isRevenueCatPurchaseCancelled,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  syncRevenueCatCustomerInfoToProfile,
  type RevenueCatPackageMap,
} from '../services/revenueCat';

const featureCards = [
  {
    icon: traderEdgeIcons.debrief,
    title: 'MISSION DEBRIEF',
    body: 'Log the session and capture the lesson.',
  },
  {
    icon: traderEdgeIcons.disciplineScore,
    title: 'DISCIPLINE SCORE',
    body: 'Grade your patience, focus, execution, and rule-following.',
  },
  {
    icon: traderEdgeIcons.vault,
    title: 'MISSION VAULT',
    body: 'Save missions, debriefs, and results in one searchable record.',
  },
];

type ProUpsellScreenProps = {
  onClose?: () => void;
};

export function ProUpsellScreen({ onClose }: ProUpsellScreenProps) {
  const { user, userProfile } = useAuth();
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [packageMap, setPackageMap] = useState<RevenueCatPackageMap>({});
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [storeUnavailableMessage, setStoreUnavailableMessage] = useState<string | null>(null);
  const annualPlan = subscriptionPlans.find((plan) => plan.id === 'pro_annual') || subscriptionPlans[0];
  const secondaryPlans = subscriptionPlans.filter((plan) => plan.id !== annualPlan.id);

  useEffect(() => {
    if (!user) {
      setIsLoadingOfferings(false);
      return;
    }

    let isActive = true;
    const userId = user.uid;

    async function loadOfferings() {
      setIsLoadingOfferings(true);
      setStoreUnavailableMessage(null);

      try {
        const configured = await configureRevenueCatForUser(userId);
        if (!configured) {
          if (isActive) {
            setStoreUnavailableMessage('RevenueCat is missing its public SDK key for this platform.');
          }
          return;
        }

        const offering = await fetchCurrentOffering();
        if (isActive) {
          setPackageMap(getPackageMapFromOffering(offering));
          if (!offering) {
            setStoreUnavailableMessage('No RevenueCat offering is configured yet.');
          }
        }
      } catch (error) {
        console.warn('[ProUpsell] Unable to load RevenueCat offerings:', error);
        if (isActive) {
          setStoreUnavailableMessage('The App Store is not ready yet. Check your connection and try again.');
        }
      } finally {
        if (isActive) setIsLoadingOfferings(false);
      }
    }

    loadOfferings();

    return () => {
      isActive = false;
    };
  }, [user]);

  function getDisplayPrice(plan: typeof subscriptionPlans[number]) {
    return packageMap[plan.id]?.product.priceString || plan.displayPrice;
  }

  async function handlePurchase(plan: typeof subscriptionPlans[number]) {
    if (!user) {
      Alert.alert('SIGN IN REQUIRED', 'Sign in before unlocking Elite access.');
      return;
    }

    const storePackage = packageMap[plan.id];
    if (!storePackage) {
      Alert.alert('STORE UNAVAILABLE', storeUnavailableMessage || 'This plan is not available from RevenueCat yet.');
      return;
    }

    setPendingProductId(plan.productId);

    try {
      const customerInfo = await purchaseRevenueCatPackage(storePackage);
      await syncRevenueCatCustomerInfoToProfile(user.uid, customerInfo, {
        currentProvider: userProfile?.subscriptionProvider,
        currentTier: userProfile?.subscriptionTier,
      });
      Alert.alert('ELITE UNLOCKED', 'Your TraderEdge Elite access is active.');
    } catch (error) {
      if (isRevenueCatPurchaseCancelled(error)) return;
      const message = error instanceof Error ? error.message : 'Could not start the App Store purchase.';
      Alert.alert('PURCHASE UNAVAILABLE', message);
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleRestorePurchases() {
    if (!user) {
      Alert.alert('SIGN IN REQUIRED', 'Sign in before restoring purchases.');
      return;
    }

    setRestoreInProgress(true);
    try {
      const configured = await configureRevenueCatForUser(user.uid);
      if (!configured) {
        Alert.alert('STORE UNAVAILABLE', 'RevenueCat is missing its public SDK key for this platform.');
        return;
      }

      const customerInfo = await restoreRevenueCatPurchases();
      await syncRevenueCatCustomerInfoToProfile(user.uid, customerInfo, {
        currentProvider: userProfile?.subscriptionProvider,
        currentTier: userProfile?.subscriptionTier,
      });
      Alert.alert('RESTORE COMPLETE', 'If an active purchase is available, Elite access has been restored.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not restore purchases.';
      Alert.alert('RESTORE FAILED', message);
    } finally {
      setRestoreInProgress(false);
    }
  }

  function showPrivacyPolicy() {
    Alert.alert(
      'PRIVACY POLICY',
      'TraderEdge stores the minimum account data needed to run the app: Firebase UID, provider ID, name, email, profile settings, missions, debriefs, progress stats, and notification preferences. We do not sell personal data. Apple private relay emails are handled as the account email when provided by Apple. You can delete your account and personal app data from Profile > Account > Delete Account.',
    );
  }

  async function openTermsOfUse() {
    const supported = await Linking.canOpenURL(termsOfUseUrl);
    if (supported) {
      await Linking.openURL(termsOfUseUrl);
    } else {
      Alert.alert('TERMS OF USE', termsOfUseUrl);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed, { zIndex: 1 }]}
          >
            <Text style={styles.closeIcon}>×</Text>
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>

          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', pointerEvents: 'none' }]}>
            <Image source={require('../../assets/images/TradersEdge_appicon.png')} style={styles.brandIcon} />
          </View>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>◈ TRADEREDGE ELITE</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>{subscriptionPaywallCopy.title.toUpperCase()}</Text>
          <Text style={styles.description}>{subscriptionPaywallCopy.description}</Text>
        </View>

        <View style={styles.annualCard}>
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>BEST VALUE</Text>
          </View>
          <Text style={styles.planAccess}>{annualPlan.badge || annualPlan.accessLabel}</Text>
          <Text style={styles.annualTitle}>{annualPlan.title}</Text>
          <View style={styles.annualPriceRow}>
            <Text style={styles.annualPrice}>{getDisplayPrice(annualPlan)}</Text>
            <Text style={styles.annualInterval}>{annualPlan.billingInterval}</Text>
          </View>
          <Text style={styles.planDuration}>{annualPlan.duration}</Text>
          <Text style={styles.annualHelper}>{annualPlan.helperText}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={pendingProductId != null || isLoadingOfferings}
            onPress={() => handlePurchase(annualPlan)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            {pendingProductId === annualPlan.productId || isLoadingOfferings ? (
              <ActivityIndicator color="#101415" />
            ) : (
              <Text style={styles.primaryButtonText}>{subscriptionPaywallCopy.primaryCta}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.secondaryPlans}>
          {secondaryPlans.map((plan) => (
            <Pressable
              accessibilityRole="button"
              key={plan.id}
              disabled={pendingProductId != null}
              onPress={() => handlePurchase(plan)}
              style={({ pressed }) => [styles.secondaryPlanCard, pressed && styles.secondaryPlanCardPressed]}
            >
              <View style={styles.secondaryPlanCopy}>
                <Text style={styles.secondaryAccess}>{plan.accessLabel}</Text>
                <Text style={styles.secondaryTitle}>{plan.title}</Text>
                <Text style={styles.secondaryDuration}>{plan.duration}</Text>
                <Text style={styles.secondaryHelper}>{plan.helperText}</Text>
              </View>
              <View style={styles.secondaryPriceBlock}>
                <View style={styles.secondaryPriceRow}>
                  <Text style={styles.secondaryPrice}>{getDisplayPrice(plan)}</Text>
                  <Text style={styles.secondaryInterval}>{plan.billingInterval}</Text>
                </View>
                <Text style={styles.secondaryAction}>{pendingProductId === plan.productId ? 'Opening store' : plan.subtext}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.unlockSection}>
          <View style={styles.unlockHeader}>
            <Text style={styles.unlockEyebrow}>WHAT YOU UNLOCK</Text>
          </View>

          <View style={styles.featureList}>
            {featureCards.map((feature) => (
              <View key={feature.title} style={styles.featureCard}>
                <View style={styles.featureIconFrame}>
                  <TraderIcon Icon={feature.icon} active size={20} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureBody}>{feature.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={restoreInProgress}
          onPress={handleRestorePurchases}
          style={({ pressed }) => [styles.restoreButton, pressed && styles.restoreButtonPressed]}
        >
          <Text style={styles.restoreText}>{restoreInProgress ? 'RESTORING...' : 'RESTORE PURCHASES'}</Text>
        </Pressable>

        <Text style={styles.trustLine}>Secure • Private • Instant access</Text>

        <View style={styles.legalLinksRow}>
          <Pressable accessibilityRole="link" onPress={showPrivacyPolicy} style={styles.legalLink}>
            <Text style={styles.legalLinkText}>PRIVACY POLICY</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={openTermsOfUse} style={styles.legalLink}>
            <Text style={styles.legalLinkText}>TERMS OF USE</Text>
          </Pressable>
        </View>

        <Text style={styles.finePrint}>
          Payment is charged to your Apple ID. Auto-renewable subscriptions renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel in App Store account settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 26,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    minHeight: 76,
  },
  closeButton: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
  },
  closeIcon: {
    color: '#e9c176',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  closeText: {
    color: '#d8d2c7',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    lineHeight: 12,
  },
  brandIcon: {
    height: 76,
    width: 76,
    borderRadius: 18,
    alignSelf: 'center',
  },
  statusBadge: {
    alignSelf: 'center',
    borderColor: '#5a4e36',
    borderWidth: 1,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  statusBadgeText: {
    color: '#f7d99a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.28)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  description: {
    color: '#f0e7db',
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 325,
    textAlign: 'center',
  },
  unlockSection: {
    marginBottom: 22,
  },
  unlockHeader: {
    marginBottom: 12,
  },
  unlockEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 0,
  },
  featureList: {
    gap: 10,
  },
  featureCard: {
    alignItems: 'center',
    backgroundColor: '#1a1f20',
    borderColor: '#252d2f',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 2,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 78,
    padding: 14,
  },
  featureIconFrame: {
    alignItems: 'center',
    backgroundColor: '#111617',
    borderColor: '#34302a',
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    color: '#f7d99a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  featureBody: {
    color: '#f0e7db',
    fontSize: 12,
    lineHeight: 17,
  },
  annualCard: {
    backgroundColor: '#1a1f20',
    borderColor: '#e9c176',
    borderRadius: 5,
    borderWidth: 2,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 22,
    paddingBottom: 24,
    position: 'relative',
  },
  ribbon: {
    backgroundColor: '#f1ce89',
    position: 'absolute',
    right: -42,
    top: 24,
    transform: [{ rotate: '45deg' }],
    width: 150,
  },
  ribbonText: {
    color: '#101415',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    paddingVertical: 7,
    textAlign: 'center',
  },
  planAccess: {
    color: '#f7d99a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  annualTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  annualPriceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginBottom: 14,
  },
  annualPrice: {
    color: '#f7d99a',
    fontSize: 31,
    fontWeight: '900',
  },
  annualInterval: {
    color: '#f0e7db',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
  },
  annualHelper: {
    color: '#f0e7db',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 265,
  },
  planDuration: {
    color: '#d8d2c7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#f1ce89',
    borderColor: '#f7d99a',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 62,
    shadowColor: '#e9c176',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  primaryButtonPressed: {
    backgroundColor: '#d7ad62',
    shadowOpacity: 0.12,
    transform: [{ scale: 0.97 }, { translateY: 2 }],
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  secondaryPlans: {
    gap: 10,
    marginBottom: 24,
  },
  secondaryPlanCard: {
    alignItems: 'center',
    backgroundColor: '#1a1f20',
    borderColor: '#202729',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 94,
    padding: 16,
  },
  secondaryPlanCardPressed: {
    backgroundColor: '#202728',
    borderColor: '#5f5137',
    transform: [{ scale: 0.985 }, { translateY: 1 }],
  },
  secondaryPlanCopy: {
    flex: 1,
    paddingRight: 14,
  },
  secondaryAccess: {
    color: '#d8d2c7',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  secondaryTitle: {
    color: '#f8fafc',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  secondaryHelper: {
    color: '#f0e7db',
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryDuration: {
    color: '#d8d2c7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  secondaryPriceBlock: {
    alignItems: 'flex-end',
    minWidth: 96,
  },
  secondaryPriceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginBottom: 10,
  },
  secondaryPrice: {
    color: '#f7d99a',
    fontSize: 22,
    fontWeight: '900',
  },
  secondaryInterval: {
    color: '#f0e7db',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 3,
  },
  secondaryAction: {
    color: '#f7d99a',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 13,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  restoreButton: {
    alignItems: 'center',
    minHeight: 38,
    justifyContent: 'center',
    marginBottom: 12,
  },
  restoreButtonPressed: {
    opacity: 0.62,
    transform: [{ scale: 0.98 }],
  },
  restoreText: {
    color: '#f0e7db',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  trustLine: {
    color: '#c0b7aa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  legalLinksRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginBottom: 12,
  },
  legalLink: {
    minHeight: 28,
    justifyContent: 'center',
  },
  legalLinkText: {
    color: '#f7d99a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
  finePrint: {
    color: '#c0b7aa',
    fontSize: 10,
    lineHeight: 16,
    marginHorizontal: 8,
    textAlign: 'center',
  },
  closeButtonPressed: {
    opacity: 0.62,
    transform: [{ scale: 0.98 }],
  },
});
