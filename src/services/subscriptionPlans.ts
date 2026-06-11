export type SubscriptionPlanId = 'pro_monthly' | 'pro_annual' | 'pro_lifetime';

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  productId: string;
  title: string;
  displayPrice: string;
  billingInterval: string;
  badge?: string;
  accessLabel: string;
  helperText: string;
  subtext: string;
};

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
    productId: 'traders_edge_pro_monthly',
    title: 'Monthly Plan',
    displayPrice: '$4.99',
    billingInterval: '/mo',
    accessLabel: 'AGENT ACCESS',
    helperText: 'Start small. Build consistency one mission at a time.',
    subtext: 'Select monthly',
  },
  {
    id: 'pro_annual',
    productId: 'traders_edge_pro_annual',
    title: 'Annual Plan',
    displayPrice: '$45',
    billingInterval: '/yr',
    badge: 'ELITE CHOICE',
    accessLabel: 'OPERATOR ACCESS',
    helperText: 'Optimal for professional traders committed to long-term edge development.',
    subtext: 'Best for traders building discipline over time.',
  },
  {
    id: 'pro_lifetime',
    productId: 'traders_edge_pro_lifetime',
    title: 'Lifetime Plan',
    displayPrice: '$199',
    billingInterval: '/once',
    accessLabel: 'PERMANENT ACCESS',
    helperText: 'One payment. Permanent access to TraderEdge Elite.',
    subtext: 'Select lifetime',
  },
];

export const defaultSubscriptionPlan = subscriptionPlans[1];
