import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { OnboardingNavigationProp, OnboardingStackParamList } from './OnboardingNavigator';

type FocusOption = {
  id: string;
  label: string;
};

const FOCUS_OPTIONS: FocusOption[] = [
  { id: 'patience', label: 'Patience' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'riskControl', label: 'Risk Management' },
  { id: 'execution', label: 'Execution' },
  { id: 'confidence', label: 'Emotional Control' },
];

export function OnboardingFocusScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'OnboardingFocus'>>();
  const [selectedFocus, setSelectedFocus] = useState<string>('discipline'); // Default safe selection

  function handleContinue() {
    navigation.navigate('OnboardingCallSign', {
      ...route.params,
      focus: selectedFocus,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepText}>STEP 4 OF 6</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>MISSION CALIBRATION</Text>
          <Text style={styles.title}>What do you want to improve first?</Text>
          <Text style={styles.bodyText}>
            Your focus becomes the center of your daily mission.
          </Text>

          <View style={styles.optionsContainer}>
            {FOCUS_OPTIONS.map((focus) => {
              const isSelected = selectedFocus === focus.id;
              return (
                <Pressable
                  key={focus.id}
                  onPress={() => setSelectedFocus(focus.id)}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {focus.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>CONTINUE</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#050707',
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  stepHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  stepText: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  bodyText: {
    color: '#8a8f93',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: '#101415',
    borderColor: '#233853',
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  optionCardSelected: {
    backgroundColor: '#191c1e',
    borderColor: '#e9c176',
  },
  optionText: {
    color: '#8a8f93',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  optionTextSelected: {
    color: '#e9c176',
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
