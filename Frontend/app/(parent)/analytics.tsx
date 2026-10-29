import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../hooks/useLanguage';
import { tokens } from '../../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';

interface DayStats {
  day: string;
  completed: number;
  total: number;
}

interface LinkedKid {
  uid: string;
  name: string;
  avatarEmoji?: string;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DayStats[]>([]);
  const [linkedKids, setLinkedKids] = useState<LinkedKid[]>([]);
  const [selectedKidUid, setSelectedKidUid] = useState<string | null>(null); // null = all kids

  useEffect(() => {
    fetchAnalytics();
  }, [selectedKidUid]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const parentId = auth.currentUser?.uid;
    if (!parentId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch linked kids if not already loaded
      if (linkedKids.length === 0) {
        const parentDoc = await getDoc(doc(db, 'Users', parentId));
        if (parentDoc.exists()) {
          const kidIds: string[] = parentDoc.data().linkedKids || [];
          if (kidIds.length > 0) {
            const kidsQuery = query(collection(db, 'Users'), where('uid', 'in', kidIds));
            const kidsSnap = await getDocs(kidsQuery);
            const kidsList: LinkedKid[] = [];
            kidsSnap.forEach((d) => {
              const kd = d.data();
              kidsList.push({ uid: d.id, name: kd.name || 'Kid', avatarEmoji: kd.avatarEmoji || '👦' });
            });
            setLinkedKids(kidsList);
          }
        }
      }

      // 2. Fetch tasks for parent
      const allTasksQuery = query(
        collection(db, 'Tasks'),
        where('parentId', '==', parentId)
      );
      const allSnap = await getDocs(allTasksQuery);

      let completed = 0;
      let pending = 0;
      let xpEarned = 0;

      const tasksList: any[] = [];
      allSnap.forEach((d) => {
        const data = d.data();
        if (!selectedKidUid || data.assignedToUid === selectedKidUid) {
          tasksList.push(data);
          if (data.status === 'completed') {
            completed++;
            xpEarned += data.xp || 0;
          } else {
            pending++;
          }
        }
      });

      setTotalCompleted(completed);
      setTotalPending(pending);
      setTotalXpEarned(xpEarned);

      // 3. Compute real weekly progress by day
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon...
      const diffToMon = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMon);
      monday.setHours(0, 0, 0, 0);

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const computedDays: DayStats[] = days.map((dayName, idx) => {
        const dayStart = new Date(monday);
        dayStart.setDate(monday.getDate() + idx);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        let dayCompleted = 0;
        let dayTotal = 0;

        tasksList.forEach((t) => {
          const created = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
          const completedDate = t.completedAt?.toDate ? t.completedAt.toDate() : (t.completedAt ? new Date(t.completedAt) : null);

          if (created >= dayStart && created <= dayEnd) {
            dayTotal++;
          }
          if (completedDate && completedDate >= dayStart && completedDate <= dayEnd) {
            dayCompleted++;
          }
        });

        // Ensure total is at least completed
        dayTotal = Math.max(dayTotal, dayCompleted);

        return {
          day: dayName,
          completed: dayCompleted,
          total: dayTotal,
        };
      });

      setWeeklyData(computedDays);
    } catch (err) {
      console.error('[Analytics] Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalTasks = totalCompleted + totalPending;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  const maxBar = Math.max(...weeklyData.map((d) => d.total), 1);

  return (
    <SafeAreaView style={[styles.safeArea, isDark ? styles.bgDark : styles.bgLight]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="arrow-back" size={24} color={tokens.colors.primary} />
          </TouchableOpacity>
          <Text
            maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
            style={[styles.headerTitle, isDark ? styles.textDark : styles.textLight]}
          >
            {t('nav.analytics')}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Per-Child Selector Tabs */}
        {linkedKids.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kidsSelector}>
            <TouchableOpacity
              onPress={() => setSelectedKidUid(null)}
              style={[
                styles.kidPill,
                selectedKidUid === null
                  ? (isDark ? styles.kidPillActiveDark : styles.kidPillActiveLight)
                  : (isDark ? styles.kidPillInactiveDark : styles.kidPillInactiveLight),
              ]}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedKidUid === null }}
              accessibilityLabel="All Kids"
            >
              <Text
                style={[
                  styles.kidPillText,
                  selectedKidUid === null ? styles.kidPillTextActive : (isDark ? styles.textMutedDark : styles.textMutedLight),
                ]}
              >
                👨‍👩‍👧‍👦 {t('common.all')}
              </Text>
            </TouchableOpacity>

            {linkedKids.map((kid) => (
              <TouchableOpacity
                key={kid.uid}
                onPress={() => setSelectedKidUid(kid.uid)}
                style={[
                  styles.kidPill,
                  selectedKidUid === kid.uid
                    ? (isDark ? styles.kidPillActiveDark : styles.kidPillActiveLight)
                    : (isDark ? styles.kidPillInactiveDark : styles.kidPillInactiveLight),
                ]}
                accessible={true}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedKidUid === kid.uid }}
                accessibilityLabel={kid.name}
              >
                <Text
                  style={[
                    styles.kidPillText,
                    selectedKidUid === kid.uid ? styles.kidPillTextActive : (isDark ? styles.textMutedDark : styles.textMutedLight),
                  ]}
                >
                  {kid.avatarEmoji} {kid.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <SkeletonLoader.DashboardSkeleton />
        ) : totalTasks === 0 ? (
          <EmptyState
            icon="📊"
            title="No Activity Yet"
            message="Create quests to start tracking your family's weekly completion and progress."
          />
        ) : (
          <>
            {/* Metric Summary Cards */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.completedCard]}>
                <Text style={styles.completedLabel}>{t('tasks.completed')}</Text>
                <Text style={styles.completedValue}>{totalCompleted}</Text>
              </View>

              <View style={[styles.metricCard, styles.pendingCard]}>
                <Text style={styles.pendingLabel}>{t('tasks.pending')}</Text>
                <Text style={styles.pendingValue}>{totalPending}</Text>
              </View>
            </View>

            {/* XP & Velocity Progress */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.xpCard]}>
                <Text style={styles.xpLabel}>Total XP Earned</Text>
                <Text style={styles.xpValue}>{totalXpEarned.toLocaleString()}</Text>
              </View>

              <View style={[styles.metricCard, isDark ? styles.cardDark : styles.cardLight]}>
                <Text style={[styles.rateLabel, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                  Completion Rate
                </Text>
                <Text style={[styles.rateValue, isDark ? styles.textDark : styles.textLight]}>
                  {completionRate}%
                </Text>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
                </View>
              </View>
            </View>

            {/* Weekly Activity Bar Chart */}
            <Text
              maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
              style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}
            >
              Weekly Progress Report
            </Text>

            <View style={[styles.chartCard, isDark ? styles.cardDark : styles.cardLight]}>
              <View style={styles.barsContainer}>
                {weeklyData.map((d) => {
                  const barHeight = d.total > 0 ? (d.total / maxBar) * 120 : 6;
                  const fillHeight = d.completed > 0 ? (d.completed / maxBar) * 120 : 0;
                  return (
                    <View key={d.day} style={styles.barColumn}>
                      <View style={[styles.barTrack, { height: barHeight }]}>
                        <View style={[styles.barFill, { height: fillHeight }]} />
                      </View>
                      <Text style={[styles.dayLabel, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                        {d.day}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: tokens.colors.primary }]} />
                  <Text style={[styles.legendText, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                    Completed
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} />
                  <Text style={[styles.legendText, isDark ? styles.textMutedDark : styles.textMutedLight]}>
                    Assigned
                  </Text>
                </View>
              </View>
            </View>

            {/* Behavioral Recommendation Insight */}
            <View style={[styles.insightCard, isDark ? styles.insightDark : styles.insightLight]}>
              <View style={styles.insightHeader}>
                <Ionicons name="bulb-outline" size={22} color={tokens.colors.primary} />
                <Text style={styles.insightTitle}>Parental Insight</Text>
              </View>
              <Text style={styles.insightBody}>
                {completionRate >= 80
                  ? 'Outstanding momentum! Your family has completed over 80% of quests this week. Rewarding them in the Vault boosts consistency!'
                  : completionRate >= 50
                  ? 'Steady effort! Try breaking larger tasks into 2-3 mini-quests to encourage faster turnaround.'
                  : 'Pro-tip: Set 1-2 easy quests before school to build an early morning win!'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: tokens.colors.light.background,
  },
  bgDark: {
    backgroundColor: tokens.colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
  },
  backButton: {
    minHeight: tokens.touch.minSize,
    minWidth: tokens.touch.minSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: tokens.typography.sizes.xl,
    fontWeight: '800',
  },
  textLight: {
    color: tokens.colors.light.text,
  },
  textDark: {
    color: tokens.colors.dark.text,
  },
  textMutedLight: {
    color: tokens.colors.light.textMuted,
  },
  textMutedDark: {
    color: tokens.colors.dark.textMuted,
  },
  kidsSelector: {
    marginBottom: tokens.spacing.xl,
  },
  kidPill: {
    minHeight: tokens.touch.minSize,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
    borderWidth: 1,
  },
  kidPillActiveLight: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  kidPillActiveDark: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  kidPillInactiveLight: {
    backgroundColor: tokens.colors.light.surface,
    borderColor: tokens.colors.light.border,
  },
  kidPillInactiveDark: {
    backgroundColor: tokens.colors.dark.surfaceSubtle,
    borderColor: tokens.colors.dark.border,
  },
  kidPillText: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: '700',
  },
  kidPillTextActive: {
    color: '#FFFFFF',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radii['2xl'],
    borderWidth: 1,
  },
  completedCard: {
    backgroundColor: tokens.colors.successBg,
    borderColor: '#A7F3D0',
  },
  completedLabel: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: tokens.typography.sizes.sm,
  },
  completedValue: {
    color: '#059669',
    fontSize: tokens.typography.sizes['3xl'],
    fontWeight: '900',
    marginTop: tokens.spacing.xs,
  },
  pendingCard: {
    backgroundColor: tokens.colors.warningBg,
    borderColor: '#FDE68A',
  },
  pendingLabel: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: tokens.typography.sizes.sm,
  },
  pendingValue: {
    color: '#D97706',
    fontSize: tokens.typography.sizes['3xl'],
    fontWeight: '900',
    marginTop: tokens.spacing.xs,
  },
  xpCard: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primaryHover,
  },
  xpLabel: {
    color: '#E0E7FF',
    fontWeight: '700',
    fontSize: tokens.typography.sizes.sm,
  },
  xpValue: {
    color: '#FFFFFF',
    fontSize: tokens.typography.sizes['2xl'],
    fontWeight: '900',
    marginTop: tokens.spacing.xs,
  },
  cardLight: {
    backgroundColor: tokens.colors.light.surface,
    borderColor: tokens.colors.light.border,
  },
  cardDark: {
    backgroundColor: tokens.colors.dark.surface,
    borderColor: tokens.colors.dark.border,
  },
  rateLabel: {
    fontWeight: '700',
    fontSize: tokens.typography.sizes.sm,
  },
  rateValue: {
    fontSize: tokens.typography.sizes['2xl'],
    fontWeight: '900',
    marginTop: tokens.spacing.xs,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: tokens.radii.full,
    overflow: 'hidden',
    marginTop: tokens.spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: tokens.colors.success,
    borderRadius: tokens.radii.full,
  },
  sectionTitle: {
    fontSize: tokens.typography.sizes.lg,
    fontWeight: '800',
    marginBottom: tokens.spacing.md,
  },
  chartCard: {
    borderRadius: tokens.radii['2xl'],
    padding: tokens.spacing.xl,
    borderWidth: 1,
    marginBottom: tokens.spacing.xl,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 22,
    backgroundColor: '#E2E8F0',
    borderRadius: tokens.radii.full,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radii.full,
  },
  dayLabel: {
    fontSize: tokens.typography.sizes.xs,
    fontWeight: '700',
    marginTop: tokens.spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.xl,
    marginTop: tokens.spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: tokens.typography.sizes.xs,
    fontWeight: '600',
  },
  insightCard: {
    padding: tokens.spacing.xl,
    borderRadius: tokens.radii['2xl'],
    borderWidth: 1,
  },
  insightLight: {
    backgroundColor: tokens.colors.primarySubtle,
    borderColor: '#C7D2FE',
  },
  insightDark: {
    backgroundColor: '#1E1B4B',
    borderColor: '#3730A3',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  insightTitle: {
    fontSize: tokens.typography.sizes.base,
    fontWeight: '800',
    color: tokens.colors.primary,
    marginLeft: tokens.spacing.xs,
  },
  insightBody: {
    fontSize: tokens.typography.sizes.sm,
    lineHeight: tokens.typography.lineHeights.sm,
    color: '#4338CA',
    fontWeight: '500',
  },
});
