import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MissionStackNavigationProp } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import {
  CockpitMindsetStatus,
  cockpitStatusToDisplayLabel,
  mapMissionStatusToCockpit,
} from '../logic/missionPhase';
import { firestore } from '../services/firebase';

type ProMissionAccomplishedProps = {
  mission: any;
  hasDebrief: boolean;
  isRestarting: boolean;
  onRestartMission: () => void;
};

export function ProMissionAccomplished({
  mission,
  hasDebrief,
  isRestarting,
  onRestartMission,
}: ProMissionAccomplishedProps) {
  const navigation = useNavigation<MissionStackNavigationProp>();
  const { t } = useTranslation('mission');
  const { user } = useAuth();

  const [notes, setNotes] = useState<any[]>([]);
  const [grade, setGrade] = useState<string | null>(null);

  const objectiveKey = mission.objective;
  const focusKey = mission.coreFocus;
  const threats: string[] = mission.threats || [];

  // ── Session Status Computations ──
  const startedAtDisplay = useMemo(() => {
    const d = mission.sessionStartedAt?.toDate?.();
    if (!d) return '--:--';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [mission.sessionStartedAt]);

  const endedAtDisplay = useMemo(() => {
    const d = mission.sessionEndedAt?.toDate?.();
    if (!d) return '--:--';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [mission.sessionEndedAt]);

  const elapsedDisplay = useMemo(() => {
    const start = mission.sessionStartedAt?.toDate?.();
    const end = mission.sessionEndedAt?.toDate?.();
    if (!start || !end) return '--:--:--';
    const diff = Math.max(0, end.getTime() - start.getTime());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const sec = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, [mission.sessionStartedAt, mission.sessionEndedAt]);

  // ── Mindset Status ──
  const currentMindset: CockpitMindsetStatus =
    mission.missionStatus
      ? mapMissionStatusToCockpit(mission.missionStatus)
      : mission.currentMindsetStatus || 'on_track';
  const mindsetLabel = cockpitStatusToDisplayLabel(currentMindset);

  // ── Fetch Session Notes and Debrief ──
  useEffect(() => {
    if (!mission?.id || !user) return;
    
    const fetchNotes = async () => {
      try {
        const q = query(
          collection(firestore, 'session_notes'),
          where('missionId', '==', mission.id),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        setNotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error('Error fetching session notes:', e);
      }
    };

    const fetchDebrief = async () => {
      try {
        const q = query(
          collection(firestore, 'mission_debriefs'),
          where('missionId', '==', mission.id),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const debriefData = snap.docs[0].data();
          if (debriefData.disciplineGrade) {
            setGrade(debriefData.disciplineGrade);
          } else if (debriefData.grade) {
            setGrade(debriefData.grade);
          }
        }
      } catch (e) {
        console.error('Error fetching debrief:', e);
      }
    };

    fetchNotes();
    if (hasDebrief) {
      fetchDebrief();
    }
  }, [mission?.id, user, hasDebrief]);

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View style={s.liveRow}>
              <View style={s.liveDot} />
              <Text style={s.headerEyebrow}>POST-SESSION</Text>
            </View>
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>ELITE</Text>
            </View>
          </View>
          <Text style={s.headerObjective}>MISSION ACCOMPLISHED</Text>
          <Text style={s.headerMeta}>
            {hasDebrief
              ? 'SESSION DATA ARCHIVED AND SECURED'
              : 'DEBRIEF PENDING - REQUIRES YOUR INPUT'}
          </Text>
        </View>

        {/* ── Mission Summary Card ── */}
        <View style={s.summaryCard}>
          <View style={s.goldAccent} />
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>OBJECTIVE</Text>
            <Text style={s.summaryValue}>
              {objectiveKey
                ? t(`data.objectives.${objectiveKey}.title`).toUpperCase()
                : '—'}
            </Text>
          </View>
          
          <View style={s.divider} />
          
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>CORE FOCUS MAINTAINED</Text>
            <Text style={s.summaryValue}>
              {focusKey
                ? t(`data.focusAreas.${focusKey}`).toUpperCase()
                : '—'}
            </Text>
          </View>
        </View>

        {/* ── Threats Faced ── */}
        <View style={s.sessionCard}>
          <Text style={s.sectionEyebrow}>THREATS FACED</Text>
          {threats.length > 0 ? (
            threats.map((tKey) => (
              <View key={tKey} style={s.threatItem}>
                <Text style={s.threatIcon}>⚠</Text>
                <Text style={s.threatText}>
                  {t(`data.threats.${tKey}`).toUpperCase()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={s.noThreatsText}>No threats identified.</Text>
          )}
        </View>

        {/* ── Session Status ── */}
        <View style={s.sessionCard}>
          <Text style={s.sectionEyebrow}>SESSION STATUS</Text>
          <View style={s.sessionGrid}>
            <View style={s.sessionGridItem}>
              <Text style={s.gridLabel}>STARTED</Text>
              <Text style={s.gridValue}>{startedAtDisplay}</Text>
            </View>
            <View style={s.sessionGridItem}>
              <Text style={s.gridLabel}>ENDED</Text>
              <Text style={s.gridValue}>{endedAtDisplay}</Text>
            </View>
          </View>
          <View style={s.sessionGrid}>
            <View style={s.sessionGridItem}>
              <Text style={s.gridLabel}>TOTAL SESSION TIME</Text>
              <Text style={s.gridValue}>{elapsedDisplay}</Text>
            </View>
          </View>
        </View>

        {/* ── Final Mindset Status ── */}
        <View
          style={[
            s.coachingCard,
            currentMindset === 'high_risk' && s.coachingCardDanger,
            currentMindset === 'caution' && s.coachingCardWarning,
          ]}
        >
          <Text style={s.coachingEyebrow}>FINAL MINDSET STATUS</Text>
          <Text style={s.coachingText}>{mindsetLabel}</Text>
        </View>

        {/* ── Discipline Grade ── */}
        {hasDebrief && grade && (
          <View style={s.gradeDisplayContainer}>
            <View style={s.gradeDisplayAccent} />
            <View style={s.gradeDisplayContent}>
              <View style={s.gradeDisplayLeft}>
                <Text style={s.gradeDisplayTier}>SESSION GRADE</Text>
              </View>
              <View style={s.gradeDisplayRight}>
                <Text style={s.gradeDisplayLetter}>{grade}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Session Notes ── */}
        <Text style={s.sectionTitle}>SESSION NOTES</Text>
        <View style={s.notesContainer}>
          {notes.length === 0 ? (
            <Text style={s.noNotesText}>No notes recorded during this session.</Text>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={s.noteCard}>
                <View style={s.noteTypeBadge}>
                  <Text style={s.noteTypeText}>{note.noteType.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={s.noteContent}>{note.content}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Actions ── */}
        <View style={s.actionsContainer}>
          <Pressable
            style={({ pressed }) => [
              s.primaryButton,
              pressed && s.primaryButtonPressed,
            ]}
            onPress={() =>
              navigation.navigate('MissionDebrief', {
                missionId: mission.id,
                readOnly: hasDebrief,
              })
            }
          >
            <Text style={s.primaryButtonText}>
              {hasDebrief ? 'VIEW DEBRIEF' : 'COMPLETE YOUR DEBRIEF'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.secondaryButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={onRestartMission}
            disabled={isRestarting}
          >
            <Text style={s.secondaryButtonText}>
              {isRestarting ? 'STARTING...' : 'START ANOTHER MISSION'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    backgroundColor: '#101415',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  liveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  liveDot: {
    backgroundColor: '#e9c176',
    borderRadius: 5,
    height: 10,
    shadowColor: '#e9c176',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    width: 10,
  },
  headerEyebrow: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  proBadge: {
    backgroundColor: 'rgba(233, 193, 118, 0.12)',
    borderColor: 'rgba(233, 193, 118, 0.5)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proBadgeText: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerObjective: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerMeta: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 20,
    overflow: 'hidden',
    padding: 22,
    position: 'relative',
  },
  goldAccent: {
    backgroundColor: '#e9c176',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  summaryRow: {
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divider: {
    backgroundColor: 'rgba(233, 193, 118, 0.15)',
    height: 1,
    marginVertical: 16,
    width: '100%',
  },

  // Threats
  threatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  threatIcon: {
    color: '#e27b7b',
    fontSize: 14,
    marginRight: 8,
  },
  threatText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  noThreatsText: {
    color: '#8a8f93',
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Session card
  sessionCard: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 20,
    padding: 20,
  },
  sectionEyebrow: {
    color: '#e9c176',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  sessionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  sessionGridItem: {
    backgroundColor: '#14181a',
    borderColor: '#2a3135',
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  gridLabel: {
    color: '#8a8f93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  gridValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },

  // Coaching / Final Mindset
  coachingCard: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderLeftColor: '#79d284',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 24,
    marginHorizontal: 20,
    padding: 18,
  },
  coachingCardWarning: {
    borderLeftColor: '#f0c978',
  },
  coachingCardDanger: {
    borderLeftColor: '#e27b7b',
  },
  coachingEyebrow: {
    color: '#e9c176',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  coachingText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Discipline Grade
  gradeDisplayContainer: {
    backgroundColor: '#14181a',
    borderColor: 'rgba(233, 193, 118, 0.4)',
    borderWidth: 1,
    position: 'relative',
    padding: 24,
    marginVertical: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  gradeDisplayAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#e9c176',
  },
  gradeDisplayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeDisplayLeft: {
    flex: 1,
  },
  gradeDisplayRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 80,
  },
  gradeDisplayTier: {
    color: '#e9c176',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  gradeDisplayLetter: {
    color: '#e9c176',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 52,
  },

  // Session notes
  sectionTitle: {
    color: '#e9c176',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  notesContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  noNotesText: {
    color: '#8a8f93',
    fontSize: 12,
    fontStyle: 'italic',
  },
  noteCard: {
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderWidth: 1,
    padding: 16,
  },
  noteTypeBadge: {
    backgroundColor: '#2a3135',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  noteTypeText: {
    color: '#8a8f93',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  noteContent: {
    color: '#d1c5b4',
    fontSize: 14,
    lineHeight: 22,
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9c176',
    borderRadius: 4,
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonPressed: {
    backgroundColor: '#c5a059',
  },
  primaryButtonText: {
    color: '#101415',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#4e4639',
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    color: '#8a8f93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
