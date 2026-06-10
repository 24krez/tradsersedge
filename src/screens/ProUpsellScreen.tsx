import { useNavigation } from '@react-navigation/native';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { MissionStackNavigationProp } from '../../App';
import { subscriptionPaywallCopy, subscriptionPlans } from '../services/subscriptionPlans';

export function ProUpsellScreen() {
  const navigation = useNavigation<MissionStackNavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={styles.eyebrow}>{subscriptionPaywallCopy.eyebrow}</Text>
          <Text style={styles.title}>{subscriptionPaywallCopy.title}</Text>
          <Text style={styles.description}>
            {subscriptionPaywallCopy.description}
          </Text>
          <View style={styles.planList}>
            {subscriptionPlans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <View style={styles.planTopRow}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  {plan.badge ? <Text style={styles.planBadge}>{plan.badge}</Text> : null}
                </View>
                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>{plan.displayPrice}</Text>
                  <Text style={styles.planInterval}>{plan.billingInterval}</Text>
                </View>
                <Text style={styles.planHelper}>{plan.helperText}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => console.log('TODO: Implement RevenueCat Paywall')}
            style={({ pressed }) => [styles.upgradeButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.upgradeText}>{subscriptionPaywallCopy.primaryCta}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.replace('MissionActive')}
            style={({ pressed }) => [styles.returnButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.returnText}>{subscriptionPaywallCopy.secondaryCta}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    marginBottom: 24,
    width: 64,
  },
  lockIcon: {
    fontSize: 24,
  },
  eyebrow: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: '#8a8f93',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  planList: {
    gap: 10,
    marginTop: 24,
    width: '100%',
  },
  planCard: {
    backgroundColor: '#101415',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 14,
  },
  planTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  planBadge: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  planPriceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginBottom: 5,
  },
  planPrice: {
    color: '#e9c176',
    fontSize: 24,
    fontWeight: '900',
  },
  planInterval: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 3,
  },
  planHelper: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    gap: 16,
  },
  upgradeButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  upgradeText: {
    color: '#101415',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  returnButton: {
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  returnText: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
