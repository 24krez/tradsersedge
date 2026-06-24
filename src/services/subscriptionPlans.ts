export type SubscriptionPlanId = 'pro_monthly' | 'pro_annual' | 'pro_lifetime';

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  productId: string;
  purchaseType: 'subs' | 'in-app';
  title: string;
  displayPrice: string;
  billingInterval: string;
  duration: string;
  badge?: string;
  accessLabel: string;
  helperText: string;
  subtext: string;
};

export const termsOfUseUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const subscriptionPaywallCopy = {
  eyebrow: 'TRADEREDGE ELITE',
  title: 'Elite Access Required',
  description: "Unlock Mission Debrief to review your session, score your discipline, and turn today's trades into a lesson.",
  primaryCta: 'Unlock Elite Status',
  secondaryCta: 'Not Now',
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'pro_monthly',
    productId: 'com.tradersedge.elite.month',
    purchaseType: 'subs',
    title: 'Monthly Plan',
    displayPrice: '$4.99',
    billingInterval: '/mo',
    duration: '1 month, auto-renewable',
    accessLabel: 'AGENT ACCESS',
    helperText: 'Start small. Build consistency one mission at a time.',
    subtext: 'Select monthly',
  },
  {
    id: 'pro_annual',
    productId: 'com.tradersedge.elite.yearly',
    purchaseType: 'subs',
    title: 'Annual Plan',
    displayPrice: '$45',
    billingInterval: '/yr',
    duration: '1 year, auto-renewable',
    badge: 'ELITE CHOICE',
    accessLabel: 'OPERATOR ACCESS',
    helperText: 'Best for traders building discipline over time.',
    subtext: 'Best value',
  },
  {
    id: 'pro_lifetime',
    productId: 'com.tradersedge.elite.lifetime',
    purchaseType: 'in-app',
    title: 'Lifetime Plan',
    displayPrice: '$79.99',
    billingInterval: '/once',
    duration: 'One-time lifetime unlock',
    accessLabel: 'PERMANENT ACCESS',
    helperText: 'One payment. Permanent access to TraderEdge Elite.',
    subtext: 'Select lifetime',
  },
];

export const defaultSubscriptionPlan = subscriptionPlans[1];
