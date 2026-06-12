import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

import { MissionStackNavigationProp, RootStackParamList } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../services/firebase';

type Template = {
  key: string;
  objective: string;
  threats: string[];
  focus: string;
};

const objectiveKeys = ['protectCapital', 'passChallenge', 'onlyASetups', 'observationMode'];

const threatKeys = [
  'fomo',
  'overtrading',
  'revengeTrading',
  'movingStops',
  'enteringEarly',
  'chasingBreakouts',
  'lackOfPatience',
  'overLeverage',
];

const focusAreaKeys = ['patience', 'discipline', 'riskControl', 'execution', 'confidence', 'consistency'];

const templates: Template[] = [
  {
    key: 'capitalPreservation',
    objective: 'protectCapital',
    threats: ['overtrading', 'revengeTrading'],
    focus: 'riskControl',
  },
  {
    key: 'fundedAccount',
    objective: 'passChallenge',
    threats: ['movingStops', 'overLeverage'],
    focus: 'discipline',
  },
  {
    key: 'sniperSession',
    objective: 'onlyASetups',
    threats: ['fomo', 'enteringEarly', 'lackOfPatience'],
    focus: 'patience',
  },
];

export function MissionSetupScreen() {
  const { t } = useTranslation('mission');
  const { user, userProfile } = useAuth();
  const navigation = useNavigation<MissionStackNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'MissionSetup'>>();
  const editingMissionId = route.params?.missionId;
  const [selectedObjective, setSelectedObjective] = useState<string>(
    route.params?.objective || userProfile?.missionPreferences?.objective || objectiveKeys[2]
  );
  const [selectedThreats, setSelectedThreats] = useState<string[]>(
    route.params?.threats ||
      userProfile?.missionPreferences?.threats ||
      ['overtrading', 'enteringEarly', 'lackOfPatience']
  );
  const [selectedFocus, setSelectedFocus] = useState<string>(
    route.params?.coreFocus || userProfile?.missionPreferences?.coreFocus || 'discipline'
  );

  const timestamp = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(new Date());
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  async function handleBeginMission() {
    if (isSaving || !user) return;

    try {
      setIsSaving(true);

      const newPreferences = {
        objective: selectedObjective,
        threats: selectedThreats,
        coreFocus: selectedFocus,
      };
      const missionParameters = {
        ...newPreferences,
        selectedThreats,
        primaryThreat: selectedThreats[0] || null,
        threat: selectedThreats[0] || null,
      };

      if (editingMissionId) {
        await updateDoc(doc(firestore, 'missions', editingMissionId), {
          ...missionParameters,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(firestore, 'missions'), {
          userId: user.uid,
          ...missionParameters,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(firestore, 'users', user.uid), {
        missionPreferences: newPreferences,
        onboardingStatus: 'completed',
      });

      navigation.navigate('MissionActive');
    } catch (error) {
      console.error('Error starting mission:', error);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleThreat(threat: string) {
    setSelectedThreats((currentThreats) => {
      if (currentThreats.includes(threat)) {
        return currentThreats.filter((currentThreat) => currentThreat !== threat);
      }

      if (currentThreats.length >= 3) {
        return [currentThreats[1], currentThreats[2], threat];
      }

      return [...currentThreats, threat];
    });
  }

  function applyTemplate(template: Template) {
    setSelectedObjective(template.objective);
    setSelectedThreats(template.threats);
    setSelectedFocus(template.focus);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBar}>
        <Text style={styles.brand}>{t('setup.brand')}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{t('setup.title')}</Text>
        <Text style={styles.subtitle}>{t('setup.subtitle')}</Text>
      </View>

      <Section number="01" title={t('setup.sections.objective')}>
        <View style={styles.objectiveList}>
          {objectiveKeys.map((objectiveKey) => {
            const isSelected = objectiveKey === selectedObjective;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={objectiveKey}
                onPress={() => setSelectedObjective(objectiveKey)}
                style={[styles.objectiveCard, isSelected && styles.selectedObjectiveCard]}
              >
                <Text style={styles.cardEyebrow}>{t(`data.objectives.${objectiveKey}.eyebrow`)}</Text>
                <Text style={styles.cardTitle}>{t(`data.objectives.${objectiveKey}.title`)}</Text>
                <Text style={styles.cardDescription}>{t(`data.objectives.${objectiveKey}.description`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section number="02" title={t('setup.sections.threats')}>
        <Text style={styles.helperText}>{t('setup.sections.threatsHelper')}</Text>
        <View style={styles.chipGrid}>
          {threatKeys.map((threatKey) => {
            const isSelected = selectedThreats.includes(threatKey);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={threatKey}
                onPress={() => toggleThreat(threatKey)}
                style={[styles.threatChip, isSelected && styles.selectedThreatChip]}
              >
                <Text style={[styles.threatChipText, isSelected && styles.selectedChipText]}>
                  {t(`data.threats.${threatKey}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section number="03" title={t('setup.sections.focus')}>
        <View style={styles.focusGrid}>
          {focusAreaKeys.map((focusAreaKey) => {
            const isSelected = focusAreaKey === selectedFocus;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={focusAreaKey}
                onPress={() => setSelectedFocus(focusAreaKey)}
                style={[styles.focusButton, isSelected && styles.selectedFocusButton]}
              >
                <Text style={[styles.focusText, isSelected && styles.selectedFocusText]}>
                  {t(`data.focusAreas.${focusAreaKey}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <View style={styles.templateHeader}>
        <Text style={styles.quickStart}>{t('setup.templates.quickStart')}</Text>
        <Text style={styles.templateTitle}>{t('setup.templates.title')}</Text>
        <Text style={styles.templateHint}>{t('setup.templates.hint')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.templateList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {templates.map((template) => (
          <Pressable key={template.key} onPress={() => applyTemplate(template)} style={styles.templateCard}>
            <Text style={styles.templateCardTitle}>{t(`data.templates.${template.key}`)}</Text>
            <Text style={styles.templateLine}>{t('setup.templates.objPrefix')}{t(`data.objectives.${template.objective}.title`)}</Text>
            <Text style={styles.templateLine}>{t('setup.templates.threatsPrefix')}{template.threats.map(tKey => t(`data.threats.${tKey}`)).join(' / ')}</Text>
            <Text style={styles.templateLine}>{t('setup.templates.focusPrefix')}{t(`data.focusAreas.${template.focus}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.brief}>
        <View style={styles.cornerTop} />
        <View style={styles.cornerBottom} />
        <Text style={styles.briefEyebrow}>{t('setup.brief.eyebrow')}</Text>
        <Text style={styles.briefTitle}>{t('setup.brief.title')}</Text>
        <View style={styles.timestampRow}>
          <Text style={styles.timestampLabel}>{t('setup.brief.timestamp')}</Text>
          <Text style={styles.timestampValue}>{timestamp}</Text>
        </View>
        <View style={styles.goldRule} />
        <View style={styles.divider} />

        <Text style={styles.briefLabel}>{t('setup.brief.objective')}</Text>
        <Text style={styles.briefObjective}>{t(`data.objectives.${selectedObjective}.title`)}</Text>

        <Text style={[styles.briefLabel, styles.briefThreatLabel]}>{t('setup.brief.threats')}</Text>
        <View style={styles.briefThreatList}>
          {selectedThreats.length > 0 ? (
            selectedThreats.map((threat) => (
              <Text key={threat} style={styles.briefThreat}>
                {t(`data.threats.${threat}`).toUpperCase()}
              </Text>
            ))
          ) : (
            <Text style={styles.briefNoThreats}>
              NO THREATS SELECTED
            </Text>
          )}
        </View>

        <Text style={[styles.briefLabel, styles.briefFocusLabel]}>{t('setup.brief.focusLabel')}</Text>
        <Text style={styles.briefFocus}>{t(`data.focusAreas.${selectedFocus}`)}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={handleBeginMission}
        style={({ pressed }) => [
          styles.beginButton,
          (pressed || isSaving) && styles.beginButtonPressed,
        ]}
      >
        <Text style={styles.beginButtonText}>
          {isSaving ? 'SAVING...' : 'SAVE MISSION'}
        </Text>
      </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type SectionProps = {
  children: React.ReactNode;
  number: string;
  title: string;
};

function Section({ children, number, title }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumber}>{number}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#101415',
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  brandBar: {
    borderBottomColor: '#202426',
    borderBottomWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 13,
  },
  brand: {
    color: '#e9c176',
    fontSize: 14,
    fontWeight: '900',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  title: {
    color: '#e0e3e5',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3.2,
    lineHeight: 32,
  },
  subtitle: {
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
    maxWidth: 280,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 38,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 19,
  },
  sectionNumber: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  objectiveList: {
    gap: 16,
  },
  objectiveCard: {
    backgroundColor: '#191c1e',
    borderColor: '#202426',
    borderWidth: 1,
    minHeight: 116,
    paddingHorizontal: 18,
    paddingVertical: 19,
  },
  selectedObjectiveCard: {
    borderColor: '#c5a059',
  },
  cardEyebrow: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.7,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginBottom: 7,
  },
  cardDescription: {
    color: '#f8fafc',
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 280,
  },
  helperText: {
    color: '#f8fafc',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 15,
  },
  chipGrid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  threatChip: {
    backgroundColor: '#241819',
    borderColor: '#5d2f33',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  selectedThreatChip: {
    backgroundColor: '#241819',
    borderColor: '#c5a059',
  },
  threatChipText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectedChipText: {
    color: '#ff6b5f',
  },
  focusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 12,
  },
  focusButton: {
    alignItems: 'center',
    backgroundColor: '#101415',
    borderColor: '#202426',
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  selectedFocusButton: {
    borderColor: '#c5a059',
  },
  focusText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  selectedFocusText: {
    color: '#e9c176',
  },
  templateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 16,
    paddingBottom: 17,
    marginTop: -4,
  },
  quickStart: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    lineHeight: 12,
    textTransform: 'uppercase',
    width: 50,
  },
  templateTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  templateHint: {
    color: '#f8fafc',
    flex: 1,
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  templateList: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 52,
  },
  templateCard: {
    backgroundColor: '#191c1e',
    minHeight: 136,
    paddingHorizontal: 18,
    paddingVertical: 20,
    width: 240,
  },
  templateCardTitle: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.7,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  templateLine: {
    color: '#f8fafc',
    fontSize: 10,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  brief: {
    backgroundColor: '#272a2c',
    borderColor: '#8a744c',
    borderWidth: 1,
    marginHorizontal: 16,
    minHeight: 440,
    paddingLeft: 28,
    paddingRight: 18,
    paddingVertical: 26,
    position: 'relative',
  },
  cornerTop: {
    borderRightColor: '#8a744c',
    borderRightWidth: 1,
    borderTopColor: '#8a744c',
    borderTopWidth: 1,
    height: 38,
    position: 'absolute',
    right: 13,
    top: 13,
    width: 38,
  },
  cornerBottom: {
    borderBottomColor: '#8a744c',
    borderBottomWidth: 1,
    borderLeftColor: '#8a744c',
    borderLeftWidth: 1,
    bottom: 13,
    height: 38,
    left: 13,
    position: 'absolute',
    width: 38,
  },
  briefEyebrow: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  briefTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 15,
  },
  timestampRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timestampLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  timestampValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  goldRule: {
    backgroundColor: '#c5a059',
    height: 1,
    marginTop: 11,
    width: 112,
  },
  divider: {
    backgroundColor: '#363a3b',
    height: 1,
    marginTop: 26,
  },
  briefLabel: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 34,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  briefFocusLabel: {
    marginTop: 21,
  },
  briefThreatLabel: {
    marginTop: 14,
  },
  briefObjective: {
    color: '#f8fafc',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 34,
    textTransform: 'uppercase',
  },
  briefThreatList: {
    gap: 8,
    marginBottom: 18,
  },
  briefThreat: {
    color: '#ff6b5f',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  briefNoThreats: {
    color: '#8a8f93',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  briefFocus: {
    color: '#e9c176',
    fontSize: 21,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  beginButton: {
    alignItems: 'center',
    backgroundColor: '#c5a059',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 34,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  beginButtonPressed: {
    opacity: 0.82,
  },
  beginButtonText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
