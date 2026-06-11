import { useNavigation } from '@react-navigation/native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MissionStackNavigationProp } from '../../App';
import { subscriptionPaywallCopy, subscriptionPlans } from '../services/subscriptionPlans';

const featureCards = [
  {
    icon: '▣',
    title: 'MISSION DEBRIEF',
    body: 'Log what happened, review your discipline, and capture the lesson before the day ends.',
  },
  {
    icon: '☆',
    title: 'DISCIPLINE SCORE',
    body: 'Get a clear grade based on patience, focus, execution, and rule-following.',
  },
  {
    icon: '▰',
    title: 'MISSION PROGRESS',
    body: 'Track completed missions, streaks, rank movement, and discipline trends over time.',
  },
  {
    icon: '▭',
    title: 'MISSION VAULT',
    body: 'Save completed missions, debriefs, and results so you can track your discipline over time.',
  },
];

const trustItems = [
  { icon: '◇', label: 'SECURE ENCRYPTION' },
  { icon: '▦', label: 'PRIVATE INTELLIGENCE' },
  { icon: '⌁', label: 'INSTANT DEPLOYMENT' },
];

export function ProUpsellScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const annualPlan = subscriptionPlans.find((plan) => plan.id === 'pro_annual') || subscriptionPlans[0];
  const secondaryPlans = subscriptionPlans.filter((plan) => plan.id !== annualPlan.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.replace('MissionActive')}
            style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.closeIcon}>×</Text>
            <Text style={styles.closeText}>CLOSE{'\n'}MISSION</Text>
          </Pressable>

          <Text style={styles.brand}>TRADER'S{'\n'}EDGE</Text>

          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>⌾</Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>◈ ELITE OPERATIONAL STATUS</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>{subscriptionPaywallCopy.title.toUpperCase()}</Text>
          <Text style={styles.description}>{subscriptionPaywallCopy.description}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.featureList}>
          {featureCards.map((feature) => (
            <View key={feature.title} style={styles.featureCard}>
              <View style={styles.featureRail} />
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureBody}>{feature.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.annualCard}>
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{annualPlan.badge || 'ELITE CHOICE'}</Text>
          </View>
          <Text style={styles.planAccess}>{annualPlan.accessLabel}</Text>
          <Text style={styles.annualTitle}>{annualPlan.title}</Text>
          <View style={styles.annualPriceRow}>
            <Text style={styles.annualPrice}>{annualPlan.displayPrice}</Text>
            <Text style={styles.annualInterval}>{annualPlan.billingInterval}</Text>
            <Text style={styles.bestValueBadge}>BEST VALUE</Text>
          </View>
          <Text style={styles.annualHelper}>{annualPlan.helperText}</Text>
          <Text style={styles.annualSubtext}>{annualPlan.subtext}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => console.log('TODO: Implement RevenueCat Paywall', annualPlan.productId)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>{subscriptionPaywallCopy.primaryCta}</Text>
          </Pressable>
        </View>

        <View style={styles.secondaryPlans}>
          {secondaryPlans.map((plan) => (
            <Pressable
              accessibilityRole="button"
              key={plan.id}
              onPress={() => console.log('TODO: Implement RevenueCat Paywall', plan.productId)}
              style={({ pressed }) => [styles.secondaryPlanCard, pressed && styles.buttonPressed]}
            >
              <View style={styles.secondaryPlanCopy}>
                <Text style={styles.secondaryAccess}>{plan.accessLabel}</Text>
                <Text style={styles.secondaryTitle}>{plan.title}</Text>
                <Text style={styles.secondaryHelper}>{plan.helperText}</Text>
              </View>
              <View style={styles.secondaryPriceBlock}>
                <View style={styles.secondaryPriceRow}>
                  <Text style={styles.secondaryPrice}>{plan.displayPrice}</Text>
                  <Text style={styles.secondaryInterval}>{plan.billingInterval}</Text>
                </View>
                <Text style={styles.secondaryAction}>{plan.subtext}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => console.log('TODO: Restore Purchases')}
          style={({ pressed }) => [styles.restoreButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.restoreText}>RESTORE ACCESS</Text>
        </Pressable>

        <View style={styles.bottomDivider} />

        <View style={styles.trustList}>
          {trustItems.map((item) => (
            <View key={item.label} style={styles.trustItem}>
              <Text style={styles.trustIcon}>{item.icon}</Text>
              <Text style={styles.trustLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.finePrint}>
          By unlocking Elite Status, you agree to our Operational Terms of Service and Psychological Safety Privacy Policy.
          Subscriptions automatically renew unless cancelled 24 hours before the end of the current session.
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
    padding: 18,
    paddingBottom: 36,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
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
  brand: {
    color: '#f7d99a',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 5,
    lineHeight: 25,
    textAlign: 'center',
  },
  profileBadge: {
    alignItems: 'center',
    backgroundColor: '#29344a',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  profileBadgeText: {
    color: '#d9e2ef',
    fontSize: 16,
    fontWeight: '900',
  },
  statusBadge: {
    alignSelf: 'center',
    borderColor: '#5a4e36',
    borderWidth: 1,
    marginBottom: 28,
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
    marginBottom: 30,
  },
  title: {
    color: '#f8fafc',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.28)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  description: {
    color: '#f0e7db',
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 325,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#1c2223',
    height: 1,
    marginBottom: 28,
  },
  featureList: {
    gap: 16,
    marginBottom: 38,
  },
  featureCard: {
    backgroundColor: '#1a1f20',
    minHeight: 112,
    padding: 22,
    position: 'relative',
  },
  featureRail: {
    backgroundColor: '#e9c176',
    height: 24,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  featureIcon: {
    color: '#f7d99a',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 20,
  },
  featureTitle: {
    color: '#f7d99a',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  featureBody: {
    color: '#f0e7db',
    fontSize: 13,
    lineHeight: 18,
  },
  annualCard: {
    backgroundColor: '#1a1f20',
    borderColor: '#e9c176',
    borderRadius: 5,
    borderWidth: 2,
    marginBottom: 22,
    overflow: 'hidden',
    padding: 26,
    paddingBottom: 28,
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
    marginBottom: 22,
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
  bestValueBadge: {
    borderColor: '#6a5938',
    borderWidth: 1,
    color: '#f7d99a',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginLeft: 18,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  annualHelper: {
    color: '#f0e7db',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    maxWidth: 265,
  },
  annualSubtext: {
    color: '#f7d99a',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 28,
    maxWidth: 265,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#f1ce89',
    justifyContent: 'center',
    minHeight: 62,
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  secondaryPlans: {
    gap: 18,
    marginBottom: 34,
  },
  secondaryPlanCard: {
    alignItems: 'center',
    backgroundColor: '#1a1f20',
    borderColor: '#202729',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 112,
    padding: 22,
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
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: 28,
  },
  restoreText: {
    color: '#f0e7db',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  bottomDivider: {
    backgroundColor: '#1c2223',
    height: 1,
    marginBottom: 30,
  },
  trustList: {
    alignItems: 'center',
    gap: 38,
    marginBottom: 42,
  },
  trustItem: {
    alignItems: 'center',
  },
  trustIcon: {
    color: '#d8d2c7',
    fontSize: 20,
    marginBottom: 8,
  },
  trustLabel: {
    color: '#c0b7aa',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  finePrint: {
    color: '#c0b7aa',
    fontSize: 10,
    lineHeight: 16,
    marginHorizontal: 8,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
