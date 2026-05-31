import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Objective = {
  eyebrow: string;
  title: string;
  description: string;
};

type Template = {
  title: string;
  objective: string;
  threats: string[];
  focus: string;
};

const objectives: Objective[] = [
  {
    eyebrow: 'Safety First',
    title: 'Protect Capital',
    description: 'Preserve capital and avoid unnecessary risk at all costs.',
  },
  {
    eyebrow: 'Evaluation',
    title: 'Pass Challenge',
    description: 'Focus on meeting professional evaluation requirements.',
  },
  {
    eyebrow: 'Selectivity',
    title: 'Take Only A+ Setups',
    description: 'Prioritize quality over quantity. Reject anything subpar.',
  },
  {
    eyebrow: 'Learning',
    title: 'Observation Mode',
    description: 'Focus on learning and observing market flow without risk.',
  },
];

const threats = [
  'FOMO',
  'Overtrading',
  'Revenge Trading',
  'Moving Stops',
  'Entering Early',
  'Chasing Breakouts',
  'Lack of Patience',
  'Over-Leverage',
];

const focusAreas = ['Patience', 'Discipline', 'Risk Control', 'Execution', 'Confidence', 'Consistency'];

const templates: Template[] = [
  {
    title: 'Capital Preservation',
    objective: 'Protect Capital',
    threats: ['Overtrading', 'Revenge Trading'],
    focus: 'Risk Control',
  },
  {
    title: 'Funded Account',
    objective: 'Pass Challenge',
    threats: ['Moving Stops', 'Over-Leverage'],
    focus: 'Discipline',
  },
  {
    title: 'Sniper Session',
    objective: 'Take Only A+ Setups',
    threats: ['FOMO', 'Entering Early', 'Lack of Patience'],
    focus: 'Patience',
  },
];

export function MissionSetupScreen() {
  const [selectedObjective, setSelectedObjective] = useState(objectives[2].title);
  const [selectedThreats, setSelectedThreats] = useState(['Overtrading', 'Entering Early', 'Lack of Patience']);
  const [selectedFocus, setSelectedFocus] = useState('Discipline');

  const timestamp = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(new Date());
  }, []);

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
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.container}
    >
      <View style={styles.brandBar}>
        <Text style={styles.brand}>TRADER'S EDGE</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>MISSION SETUP</Text>
        <Text style={styles.subtitle}>Define today's mission before entering the market.</Text>
      </View>

      <Section number="01" title="Choose Objective">
        <View style={styles.objectiveList}>
          {objectives.map((objective) => {
            const isSelected = objective.title === selectedObjective;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={objective.title}
                onPress={() => setSelectedObjective(objective.title)}
                style={[styles.objectiveCard, isSelected && styles.selectedObjectiveCard]}
              >
                <Text style={styles.cardEyebrow}>{objective.eyebrow}</Text>
                <Text style={styles.cardTitle}>{objective.title}</Text>
                <Text style={styles.cardDescription}>{objective.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section number="02" title="Identify Threats">
        <Text style={styles.helperText}>Select up to three operational hazards.</Text>
        <View style={styles.chipGrid}>
          {threats.map((threat) => {
            const isSelected = selectedThreats.includes(threat);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={threat}
                onPress={() => toggleThreat(threat)}
                style={[styles.threatChip, isSelected && styles.selectedThreatChip]}
              >
                <Text style={[styles.threatChipText, isSelected && styles.selectedChipText]}>{threat}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section number="03" title="Core Focus">
        <View style={styles.focusGrid}>
          {focusAreas.map((focusArea) => {
            const isSelected = focusArea === selectedFocus;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={focusArea}
                onPress={() => setSelectedFocus(focusArea)}
                style={[styles.focusButton, isSelected && styles.selectedFocusButton]}
              >
                <Text style={[styles.focusText, isSelected && styles.selectedFocusText]}>{focusArea}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <View style={styles.templateHeader}>
        <Text style={styles.quickStart}>Quick Start</Text>
        <Text style={styles.templateTitle}>Templates</Text>
        <Text style={styles.templateHint}>Swipe for more configurations</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.templateList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {templates.map((template) => (
          <Pressable key={template.title} onPress={() => applyTemplate(template)} style={styles.templateCard}>
            <Text style={styles.templateCardTitle}>{template.title}</Text>
            <Text style={styles.templateLine}>OBJ: {template.objective}</Text>
            <Text style={styles.templateLine}>THREATS: {template.threats.join('/')}</Text>
            <Text style={styles.templateLine}>FOCUS: {template.focus}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.brief}>
        <View style={styles.cornerTop} />
        <View style={styles.cornerBottom} />
        <Text style={styles.briefEyebrow}>Current Configuration</Text>
        <Text style={styles.briefTitle}>MISSION BRIEF</Text>
        <View style={styles.timestampRow}>
          <Text style={styles.timestampLabel}>TIMESTAMP:</Text>
          <Text style={styles.timestampValue}>{timestamp}</Text>
        </View>
        <View style={styles.goldRule} />
        <View style={styles.divider} />

        <Text style={styles.briefLabel}>Objective</Text>
        <Text style={styles.briefObjective}>{selectedObjective}</Text>

        <Text style={[styles.briefLabel, styles.briefThreatLabel]}>Identified Threats</Text>
        <View style={styles.briefThreatList}>
          {selectedThreats.map((threat) => (
            <Text key={threat} style={styles.briefThreat}>
              {threat}
            </Text>
          ))}
        </View>

        <Text style={[styles.briefLabel, styles.briefFocusLabel]}>Core Focus</Text>
        <Text style={styles.briefFocus}>{selectedFocus}</Text>
      </View>

      <Pressable accessibilityRole="button" style={({ pressed }) => [styles.beginButton, pressed && styles.beginButtonPressed]}>
        <Text style={styles.beginButtonText}>Begin Mission</Text>
      </Pressable>
    </ScrollView>
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
