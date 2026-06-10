export type SubscriptionPlanId = 'pro_monthly' | 'pro_annual';

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  productId: string;
  title: string;
  displayPrice: string;
  billingInterval: string;
  badge?: string;
  helperText: string;
};

export const subscriptionPaywallCopy = {
  eyebrow: 'TRADEREDGE PRO',
  title: 'Unlock TraderEdge Pro',
  description: 'Review missions, track discipline, and stay accountable with advanced trading insights.',
  primaryCta: 'Upgrade to Pro',
  secondaryCta: 'Not Now',
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'pro_monthly',
    productId: 'traders_edge_pro_monthly',
    title: 'Monthly',
    displayPrice: '$9.99',
    billingInterval: '/mo',
    helperText: 'Flexible monthly access.',
  },
  {
    id: 'pro_annual',
    productId: 'traders_edge_pro_annual',
    title: 'Annual',
    displayPrice: '$79.99',
    billingInterval: '/yr',
    badge: 'BEST VALUE',
    helperText: 'Save with annual access.',
  },
];

export const defaultSubscriptionPlan = subscriptionPlans[0];
