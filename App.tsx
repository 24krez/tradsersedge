import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

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

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'mission', label: 'Mission' },
  { key: 'progress', label: 'Progress' },
  { key: 'vault', label: 'Vault' },
  { key: 'profile', label: 'Profile' },
];

const missionScreens = [
  WelcomeScreen,
  MissionSetupScreen,
  ReadinessCheckScreen,
  MissionActiveScreen,
  MissionDebriefScreen,
  MissionResultsScreen,
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('mission');
  const ActiveMissionScreen = missionScreens[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        {activeTab === 'mission' && <ActiveMissionScreen />}
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
    backgroundColor: '#15191a',
    borderTopColor: '#2d3436',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  activeTabItem: {
    borderBottomColor: '#e9c176',
    borderBottomWidth: 2,
  },
  tabLabel: {
    color: '#8d9698',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabLabel: {
    color: '#f8fafc',
  },
});
