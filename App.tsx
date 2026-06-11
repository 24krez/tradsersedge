import { signOut } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { firebaseAuth } from './src/services/firebase';

import './src/i18n';

import { MissionActiveScreen } from './src/screens/MissionActiveScreen';
import { MissionDebriefScreen } from './src/screens/MissionDebriefScreen';
import { MissionResultsScreen } from './src/screens/MissionResultsScreen';
import { MissionSetupScreen } from './src/screens/MissionSetupScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReadinessCheckScreen } from './src/screens/ReadinessCheckScreen';
import { VaultScreen } from './src/screens/VaultScreen';
import { MissionDetailRouteScreen } from './src/screens/MissionDetailScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { ProUpsellScreen } from './src/screens/ProUpsellScreen';
import { LockScreenBriefingRouteScreen } from './src/screens/LockScreenBriefingScreen';
import { LaunchIntroScreen } from './src/screens/LaunchIntroScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { TraderIcon, traderEdgeIcons } from './src/components/TraderIcon';
import { OnboardingNavigator } from './src/screens/onboarding/OnboardingNavigator';
import { TrialPromoModal } from './src/components/TrialPromoModal';

type TabKey = 'mission' | 'progress' | 'vault' | 'profile';
export type RootStackParamList = {
  ReadinessCheck:
    | {
        missionId?: string;
        objective?: string;
        threats?: string[];
        coreFocus?: string;
      }
    | undefined;
  MissionSetup:
    | {
        missionId?: string;
        objective?: string;
        threats?: string[];
        coreFocus?: string;
      }
    | undefined;
  MissionActive: undefined;
  MissionDebrief: { missionId?: string; readOnly?: boolean } | undefined;
  MissionResults: { debriefId?: string; missionId?: string } | undefined;
  MissionDetail: { missionId: string };
  LockScreenBriefing: undefined;
  Welcome: undefined;
  ProUpsell: undefined;
  Vault: undefined;
};

export type MissionStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#101415',
  },
};

function MissionStackNavigator({ initialRouteName = 'MissionActive' }: { initialRouteName?: keyof RootStackParamList }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#101415' },
      }}
    >
      <Stack.Screen name="MissionActive" component={MissionActiveScreen} />
      <Stack.Screen name="MissionSetup" component={MissionSetupScreen} />
      <Stack.Screen name="ReadinessCheck" component={ReadinessCheckScreen} />
      <Stack.Screen name="MissionDebrief" component={MissionDebriefScreen} />
      <Stack.Screen name="MissionResults" component={MissionResultsScreen} />
      <Stack.Screen name="MissionDetail" component={MissionDetailRouteScreen} />
      <Stack.Screen name="LockScreenBriefing" component={LockScreenBriefingRouteScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ProUpsell" component={ProUpsellScreen} />
      <Stack.Screen name="Vault" component={VaultScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('mission');
  const [missionInitialRoute, setMissionInitialRoute] = useState<keyof RootStackParamList>('MissionActive');
  const [hasSeenLaunchIntro, setHasSeenLaunchIntro] = useState(false);
  const { user, userProfile, isLoading, isAnonymous } = useAuth();
  
  const prevOnboardingStatus = useRef(userProfile?.onboardingStatus);

  // Auto-logout anonymous users from old dev/test sessions
  useEffect(() => {
    if (user && isAnonymous) {
      console.log('[Auth] Auto-logging out anonymous user from dev session');
      signOut(firebaseAuth).catch((err) => console.error('[Auth] Anonymous signout error:', err));
    }
  }, [user, isAnonymous]);

  useEffect(() => {
    if (prevOnboardingStatus.current && prevOnboardingStatus.current !== 'completed' && userProfile?.onboardingStatus === 'completed') {
      setMissionInitialRoute('MissionSetup');
      setActiveTab('mission');
    }
    prevOnboardingStatus.current = userProfile?.onboardingStatus;
  }, [userProfile?.onboardingStatus]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'mission', label: t('tabs.mission', 'Mission') },
    { key: 'progress', label: t('tabs.progress', 'Progress') },
    { key: 'vault', label: t('tabs.vault', 'Vault') },
    { key: 'profile', label: t('tabs.profile', 'Profile') },
  ];

  function openProUpsell() {
    setMissionInitialRoute('ProUpsell');
    setActiveTab('mission');
  }

  function handleTabPress(tab: TabKey) {
    if (tab === 'mission') {
      setMissionInitialRoute('MissionActive');
    }
    setActiveTab(tab);
  }

  if (!hasSeenLaunchIntro) {
    return (
      <LaunchIntroScreen
        isReady={!isLoading}
        onComplete={() => setHasSeenLaunchIntro(true)}
      />
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <WelcomeScreen />
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  if (userProfile && userProfile.onboardingStatus !== 'completed') {
    return (
      <NavigationContainer theme={DarkNavTheme}>
        <OnboardingNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.screen}>
        {activeTab === 'mission' && (
          <NavigationContainer theme={DarkNavTheme}>
            <MissionStackNavigator initialRouteName={missionInitialRoute} />
          </NavigationContainer>
        )}
        {activeTab === 'progress' && (
          <ProgressScreen
            onOpenVault={() => setActiveTab('vault')}
            onOpenPaywall={openProUpsell}
            onStartMission={() => setActiveTab('mission')}
          />
        )}
        {activeTab === 'vault' && <VaultScreen onOpenPaywall={openProUpsell} />}
        {activeTab === 'profile' && <ProfileScreen onOpenPaywall={openProUpsell} />}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 7) }]}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
            >
              <TraderIcon Icon={traderEdgeIcons[tab.key]} active={isActive} size={18} />
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TrialPromoModal onOpenPaywall={openProUpsell} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101415',
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0b0f10',
    borderTopColor: '#202426',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    borderTopColor: 'transparent',
    borderTopWidth: 1,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
    paddingTop: 6,
  },
  activeTabItem: {
    borderTopColor: '#e9c176',
  },
  tabLabel: {
    color: '#f8fafc',
    fontSize: 7,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activeTabLabel: {
    color: '#e9c176',
  },
});
