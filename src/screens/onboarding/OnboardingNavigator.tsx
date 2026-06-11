import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';

import { OnboardingBriefingScreen } from './OnboardingBriefingScreen';
import { OnboardingSessionScreen } from './OnboardingSessionScreen';
import { OnboardingWelcomeScreen } from './OnboardingWelcomeScreen';
import { OnboardingThreatScreen } from './OnboardingThreatScreen';
import { OnboardingFocusScreen } from './OnboardingFocusScreen';
import { OnboardingCallSignScreen } from './OnboardingCallSignScreen';

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingSession: undefined;
  OnboardingThreat: { tradingStartTime: string; tradingEndTime: string };
  OnboardingFocus: { tradingStartTime: string; tradingEndTime: string; threat: string };
  OnboardingCallSign: { tradingStartTime: string; tradingEndTime: string; threat: string; focus: string };
  OnboardingBriefing: { tradingStartTime: string; tradingEndTime: string; threat: string; focus: string; callSign: string };
};

export type OnboardingNavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#101415' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="OnboardingSession" component={OnboardingSessionScreen} />
      <Stack.Screen name="OnboardingThreat" component={OnboardingThreatScreen} />
      <Stack.Screen name="OnboardingFocus" component={OnboardingFocusScreen} />
      <Stack.Screen name="OnboardingCallSign" component={OnboardingCallSignScreen} />
      <Stack.Screen name="OnboardingBriefing" component={OnboardingBriefingScreen} />
    </Stack.Navigator>
  );
}
