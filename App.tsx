import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MissionActiveScreen } from './src/screens/MissionActiveScreen';
import { MissionDebriefScreen } from './src/screens/MissionDebriefScreen';
import { MissionResultsScreen } from './src/screens/MissionResultsScreen';
import { MissionSetupScreen } from './src/screens/MissionSetupScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReadinessCheckScreen } from './src/screens/ReadinessCheckScreen';
import { VaultScreen } from './src/screens/VaultScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';

type TabKey = 'mission' | 'progress' | 'vault' | 'profile';
type RootStackParamList = {
  ReadinessCheck: undefined;
  MissionSetup: undefined;
  MissionActive: undefined;
  MissionDebrief: undefined;
  MissionResults: undefined;
  Welcome: undefined;
};

export type MissionStackNavigationProp = NavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'mission', label: 'Mission' },
  { key: 'progress', label: 'Progress' },
  { key: 'vault', label: 'Vault' },
  { key: 'profile', label: 'Profile' },
];

function MissionStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ReadinessCheck" component={ReadinessCheckScreen} />
      <Stack.Screen name="MissionSetup" component={MissionSetupScreen} />
      <Stack.Screen name="MissionActive" component={MissionActiveScreen} />
      <Stack.Screen name="MissionDebrief" component={MissionDebriefScreen} />
      <Stack.Screen name="MissionResults" component={MissionResultsScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('mission');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        {activeTab === 'mission' && (
          <NavigationContainer>
            <MissionStackNavigator />
          </NavigationContainer>
        )}
        {activeTab === 'progress' && <ProgressScreen />}
        {activeTab === 'vault' && <VaultScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
            >
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
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
    paddingBottom: 7,
  },
  tabItem: {
    alignItems: 'center',
    borderTopColor: 'transparent',
    borderTopWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
    paddingTop: 7,
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
