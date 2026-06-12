import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { calculateMissionStatus, MindsetCheckin } from '../logic/missionStatus';
import { mapMissionStatusToCockpit } from '../logic/missionPhase';
import { firebaseAuth, firestore } from '../services/firebase';
import { updateMissionLiveActivity } from '../services/liveActivityAdapter';
import { sendMissionCoachingLockScreenNotification } from '../services/lockScreenCoachingService';
import type { AlertSettings } from '../contexts/AuthContext';

type ReadinessLevel = 'Low' | 'Medium' | 'High';
type AssessmentKey = 'executionConfidence' | 'patienceReserve' | 'marketFocus';

export function CompactMindsetModule({
  alertSettings,
  liveActivitiesEnabled = false,
  missionId,
}: {
  alertSettings?: AlertSettings;
  liveActivitiesEnabled?: boolean;
  missionId: string;
}) {
  const { t } = useTranslation('mission');
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [ratings, setRatings] = useState<Record<AssessmentKey, ReadinessLevel>>({
    executionConfidence: 'High',
    patienceReserve: 'Medium',
    marketFocus: 'High',
  });
  const [previousCheckin, setPreviousCheckin] = useState<MindsetCheckin | null>(null);

  useEffect(() => {
    if (!firebaseAuth.currentUser || !missionId) return;
    const fetchInitial = async () => {
      const q = query(
        collection(firestore, 'mindset_checkins'),
        where('missionId', '==', missionId),
        where('userId', '==', firebaseAuth.currentUser!.uid),
        orderBy('createdAt', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const prev: MindsetCheckin = {
          confidence: data.confidence,
          patience: data.patience,
          focus: data.focus,
        };
        setPreviousCheckin(prev);
        setRatings({
          executionConfidence: prev.confidence,
          patienceReserve: prev.patience,
          marketFocus: prev.focus,
        });
      }
    };
    fetchInitial();
  }, [missionId]);

  const currentStatusResult = useMemo(() => {
    return calculateMissionStatus(
      {
        confidence: ratings.executionConfidence,
        patience: ratings.patienceReserve,
        focus: ratings.marketFocus,
      },
      previousCheckin || undefined,
    );
  }, [ratings, previousCheckin]);

  const levels: ReadinessLevel[] = ['Low', 'Medium', 'High'];
  const assessmentItems: Array<{ key: AssessmentKey; title: string }> = [
    { key: 'executionConfidence', title: 'Confidence' },
    { key: 'patienceReserve', title: 'Patience' },
    { key: 'marketFocus', title: 'Focus' },
  ];

  const handleUpdate = async () => {
    if (!firebaseAuth.currentUser || !missionId) return;
    setIsSaving(true);
    try {
      const q = query(
        collection(firestore, 'mindset_checkins'),
        where('missionId', '==', missionId),
        where('userId', '==', firebaseAuth.currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);

      let checkinData = undefined;
      if (!snap.empty) {
        const data = snap.docs[0].data();
        checkinData = {
          confidence: data.confidence,
          patience: data.patience,
          focus: data.focus,
        } as MindsetCheckin;
      }

      const newStatusResult = calculateMissionStatus(
        {
          confidence: ratings.executionConfidence,
          patience: ratings.patienceReserve,
          focus: ratings.marketFocus,
        },
        checkinData || previousCheckin || undefined,
      );
      const currentMindsetStatus = mapMissionStatusToCockpit(newStatusResult.status);

      await addDoc(collection(firestore, 'mindset_checkins'), {
        missionId,
        userId: firebaseAuth.currentUser.uid,
        type: 'mid_session',
        confidence: ratings.executionConfidence,
        patience: ratings.patienceReserve,
        focus: ratings.marketFocus,
        missionStatus: newStatusResult.status,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(firestore, 'missions', missionId), {
        currentMindsetStatus,
        missionStatus: newStatusResult.status,
        lastMindsetScore: newStatusResult.score,
      });

      if (liveActivitiesEnabled) {
        await updateMissionLiveActivity({
          id: missionId,
          status: 'active',
          missionStatus: newStatusResult.status,
          currentMindsetStatus,
        });
      }

      await sendMissionCoachingLockScreenNotification({
        alertSettings,
        coachingStyle: alertSettings?.coaching?.style,
        mission: {
          id: missionId,
          missionStatus: newStatusResult.status,
          currentMindsetStatus,
        },
        screenContext: 'lock_screen',
      });

      setIsExpanded(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isExpanded) {
    return (
      <Pressable onPress={() => setIsExpanded(true)} style={mindsetStyles.toggleBtn}>
        <Text style={mindsetStyles.toggleBtnText}>+ UPDATE MINDSET</Text>
      </Pressable>
    );
  }

  return (
    <View style={mindsetStyles.container}>
      <View style={mindsetStyles.accentLine} />
      <View style={mindsetStyles.headerRow}>
        <Text style={mindsetStyles.label}>{t('missionActive.mindsetUpdateLabel')}</Text>
        <Pressable onPress={() => setIsExpanded(false)} style={mindsetStyles.closeBtn}>
          <Text style={mindsetStyles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <View style={mindsetStyles.statusChipsContainer}>
        {['On Track', 'Caution', 'High Risk'].map((chipStatus) => {
          const isLockedIn = currentStatusResult.status === 'Locked In';
          const isThisChipActive = currentStatusResult.status === chipStatus || (isLockedIn && chipStatus === 'On Track');

          let icon = '';
          let label = chipStatus.toUpperCase();
          if (chipStatus === 'On Track') {
            icon = isLockedIn && isThisChipActive ? '🔒' : '🟢';
            label = isLockedIn && isThisChipActive ? 'LOCKED IN' : 'ON TRACK';
          }
          if (chipStatus === 'Caution') icon = '🟡';
          if (chipStatus === 'High Risk') icon = '🔴';

          return (
            <View key={chipStatus} style={[mindsetStyles.statusChip, isThisChipActive && mindsetStyles.statusChipActive]}>
              <Text style={[mindsetStyles.statusChipText, isThisChipActive && mindsetStyles.statusChipTextActive]}>
                {icon} {label}
              </Text>
            </View>
          );
        })}
      </View>
      {assessmentItems.map((item) => (
        <View key={item.key} style={mindsetStyles.row}>
          <Text style={mindsetStyles.title}>{item.title}</Text>
          <View style={mindsetStyles.segments}>
            {levels.map((level) => {
              const isSelected = ratings[item.key] === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setRatings((prev) => ({ ...prev, [item.key]: level }))}
                  style={[mindsetStyles.segment, isSelected && mindsetStyles.segmentSelected]}
                >
                  <Text style={[mindsetStyles.segmentText, isSelected && mindsetStyles.segmentTextSelected]}>
                    {t(`readinessCheck.levels.${level}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Pressable onPress={handleUpdate} disabled={isSaving} style={mindsetStyles.saveBtn}>
        <Text style={mindsetStyles.saveBtnText}>{isSaving ? '...' : t('missionActive.updateMindsetBtn')}</Text>
      </Pressable>
    </View>
  );
}

const mindsetStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderWidth: 1,
    marginTop: 16,
    padding: 24,
    width: '100%',
  },
  accentLine: {
    backgroundColor: '#e9c176',
    height: '12.5%',
    left: -1,
    position: 'absolute',
    top: 24,
    width: 3,
  },
  label: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#8a8f93',
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  segments: {
    backgroundColor: '#0a0f10',
    borderColor: '#2a3135',
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  segmentSelected: {
    backgroundColor: '#e9c176',
  },
  segmentText: {
    color: '#8a8f93',
    fontSize: 10,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: '#101415',
  },
  saveBtn: {
    alignItems: 'center',
    borderColor: '#e9c176',
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 12,
  },
  saveBtnText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 16,
  },
  statusChip: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: '#2a3135',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
  },
  statusChipActive: {
    backgroundColor: '#2a3135',
    borderColor: '#e9c176',
  },
  statusChipText: {
    color: '#808d93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusChipTextActive: {
    color: '#e0e3e5',
  },
  toggleBtn: {
    alignItems: 'center',
    backgroundColor: '#1a1e1f',
    borderColor: 'rgba(233, 193, 118, 0.2)',
    borderLeftColor: '#e9c176',
    borderLeftWidth: 3,
    borderWidth: 1,
    marginTop: 16,
    paddingVertical: 16,
    width: '100%',
  },
  toggleBtnText: {
    color: '#e9c176',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
