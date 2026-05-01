import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Kid } from '../types';
import { xpToNextLevel } from '../constants/XP';
import { getEarnedBadges, type BadgeDef } from '../constants/Badges';

// ─── useKidProfile Hook ───────────────────────────────────────────────────────

interface KidProfileState {
  profile: Kid | null;
  isLoading: boolean;
  xpProgress: {
    current: number;
    required: number;
    level: number;
    progressPercent: number;
  };
  earnedBadges: BadgeDef[];
}

/**
 * Real-time listener for a kid's profile document.
 * Also computes XP progress and earned badges.
 */
export function useKidProfile(kidId: string | null | undefined): KidProfileState {
  const [profile, setProfile] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!kidId) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'Users', kidId), (snap) => {
      if (snap.exists()) {
        setProfile({ ...snap.data(), uid: snap.id } as Kid);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [kidId]);

  const xpProgress = profile
    ? xpToNextLevel(profile.totalXp ?? 0)
    : { current: 0, required: 100, level: 1, progressPercent: 0 };

  const earnedBadges = profile
    ? getEarnedBadges({
        tasksCompleted: profile.tasksCompleted ?? 0,
        currentStreak: profile.currentStreak ?? 0,
        bestStreak: profile.bestStreak ?? 0,
        totalXp: profile.totalXp ?? 0,
        level: profile.level ?? 1,
        rewardsClaimed: profile.rewardsClaimed ?? 0,
      })
    : [];

  return { profile, isLoading, xpProgress, earnedBadges };
}
