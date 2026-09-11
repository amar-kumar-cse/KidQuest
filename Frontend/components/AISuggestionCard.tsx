import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../lib/firebase';
import { useSuggestionStore, StudySuggestions } from '../store/useSuggestionStore';

export interface AISuggestionCardProps {
  userId?: string;
  isLoading?: boolean;
  error?: string | null;
  suggestions?: StudySuggestions | string[] | null;
  onRetry?: () => void;
  onPressSubject?: (subject: string) => void;
}

export function AISuggestionCard(props: AISuggestionCardProps) {
  const store = useSuggestionStore();
  const targetUid = props.userId || auth.currentUser?.uid;

  // Derive state from props (if provided e.g. in tests) or from Zustand store
  const isLoading = props.isLoading !== undefined ? props.isLoading : store.isLoading;
  const error = props.error !== undefined ? props.error : store.error;
  const suggestions = props.suggestions !== undefined ? props.suggestions : store.suggestions;
  const isGenerating = store.isGenerating;

  // ── 1. Real-time listener for suggestions/{userId} ─────────────────────────
  useEffect(() => {
    // If props are passed explicitly (e.g. in unit tests), don't attach firestore listener
    if (props.suggestions !== undefined || props.isLoading !== undefined || props.error !== undefined) {
      return;
    }

    if (!targetUid) {
      store.setLoading(false);
      return;
    }

    store.setLoading(true);
    const docRef = doc(db, 'suggestions', targetUid);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as StudySuggestions;
          store.setSuggestions({
            weakSubjects: Array.isArray(data.weakSubjects) ? data.weakSubjects : [],
            bestStudyTime: data.bestStudyTime || 'Afternoon focus time',
            todaySuggestion: data.todaySuggestion || 'Complete your daily quest checklist!',
            motivationalMsg: data.motivationalMsg || 'Every small quest levels you up!',
            updatedAt: data.updatedAt,
          });
        } else {
          store.setSuggestions(null);
        }
        store.setLoading(false);
      },
      (err) => {
        console.warn('Error listening to suggestions:', err);
        store.setError(err.message || 'Failed to load suggestions.');
        store.setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetUid, props.suggestions, props.isLoading, props.error]);

  // ── 2. Trigger Cloud Function on "Refresh" ─────────────────────────────────
  const handleRefresh = async () => {
    if (props.onRetry) {
      props.onRetry();
      return;
    }

    if (!targetUid || isGenerating) return;

    store.setGenerating(true);
    try {
      const generateFn = httpsCallable<{ userId?: string }, { success: boolean; data: StudySuggestions }>(
        functions,
        'generateStudySuggestions'
      );
      const result = await generateFn({ userId: targetUid });

      if (result.data?.data) {
        store.setSuggestions(result.data.data);
      }
    } catch (err: any) {
      console.error('Failed to generate suggestions:', err);
      const message = err?.message || 'Could not reach AI coach. Please try again.';
      store.setError(message);
      Alert.alert('AI Coach Error', message);
    } finally {
      store.setGenerating(false);
    }
  };

  // ── 3. Loading Skeleton State ──────────────────────────────────────────────
  if (isLoading && !suggestions) {
    return (
      <View
        testID="ai-suggestion-loading"
        className="bg-white/90 rounded-3xl p-5 mb-4 border border-indigo-100 shadow-sm"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center space-x-2">
            <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
              <Text className="text-base">🤖</Text>
            </View>
            <Text className="text-sm font-bold text-indigo-950">AI Study Coach</Text>
          </View>
          <ActivityIndicator size="small" color="#6366F1" testID="ai-loading-indicator" />
        </View>
        <Text className="text-xs text-indigo-600 font-medium mb-2">
          Generating smart study recommendations...
        </Text>
        <View className="h-4 bg-slate-100 rounded-full w-3/4 mb-2 animate-pulse" />
        <View className="h-3 bg-slate-100 rounded-full w-1/2 animate-pulse" />
      </View>
    );
  }

  // ── 4. Error State (when no suggestions cached) ────────────────────────────
  if (error && !suggestions) {
    return (
      <View
        testID="ai-suggestion-error"
        className="bg-red-50 rounded-3xl p-5 mb-4 border border-red-200 shadow-sm"
      >
        <View className="flex-row items-center mb-2">
          <Text className="text-lg mr-2">⚠️</Text>
          <Text className="text-sm font-bold text-red-800 flex-1">Failed to load suggestions</Text>
        </View>
        <Text className="text-xs text-red-600 mb-3">{error}</Text>
        <TouchableOpacity
          testID="ai-retry-button"
          onPress={handleRefresh}
          className="bg-red-600 self-start px-4 py-2 rounded-xl"
        >
          <Text className="text-white text-xs font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── 5. Empty State ─────────────────────────────────────────────────────────
  if (!suggestions || (Array.isArray(suggestions) && suggestions.length === 0)) {
    return (
      <View
        testID="ai-suggestion-empty"
        className="bg-white rounded-3xl p-5 mb-4 border border-sky-100 shadow-sm items-center text-center"
      >
        <View className="w-12 h-12 rounded-2xl bg-indigo-50 items-center justify-center mb-2">
          <Text className="text-2xl">🤖</Text>
        </View>
        <Text className="text-base font-bold text-[#000080] mb-1">Meet Your AI Study Coach</Text>
        <Text className="text-xs text-slate-500 text-center mb-4 leading-4 px-2">
          No recommendations available at this time.
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isGenerating}
          className="bg-indigo-600 px-5 py-2.5 rounded-2xl flex-row items-center space-x-2"
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-white text-xs font-black mr-1">✨ Generate My Insights</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Handle array of strings (legacy/simple format)
  if (Array.isArray(suggestions)) {
    return (
      <View
        testID="ai-suggestion-card"
        className="bg-white rounded-3xl p-5 mb-4 border border-indigo-100 shadow-md"
      >
        <Text className="text-sm font-bold text-indigo-900 mb-3">AI Study & Habit Recommendations</Text>
        {suggestions.map((s, idx) => (
          <Text key={idx} className="text-xs text-slate-700 mb-1.5 leading-4">
            {s}
          </Text>
        ))}
      </View>
    );
  }

  // ── 6. Full Data State ─────────────────────────────────────────────────────
  return (
    <View
      testID="ai-suggestion-card"
      className="bg-white rounded-3xl p-5 mb-4 border border-indigo-100 shadow-md relative overflow-hidden"
    >
      {/* Background soft accent */}
      <View className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-50/70" />

      {/* Header Bar */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-2xl bg-indigo-100/80 items-center justify-center mr-2.5">
            <Text className="text-lg">🤖</Text>
          </View>
          <View>
            <Text className="text-xs font-black text-indigo-900 uppercase tracking-wider">
              AI Study Coach
            </Text>
            <Text className="text-[10px] text-indigo-400 font-medium">Powered by Gemini 1.5</Text>
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isGenerating}
          className="bg-indigo-50 px-3 py-1.5 rounded-xl flex-row items-center border border-indigo-100"
          activeOpacity={0.7}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <>
              <Text className="text-xs mr-1">⚡</Text>
              <Text className="text-[11px] font-bold text-indigo-700">Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Today's Action Suggestion (Highlighted Card) */}
      <View className="bg-indigo-600 rounded-2xl p-3.5 mb-3 shadow-sm">
        <View className="flex-row items-center mb-1">
          <Text className="text-white text-xs font-black mr-1.5">🎯 Today's Power Move:</Text>
        </View>
        <Text className="text-white text-xs font-semibold leading-5">
          {suggestions.todaySuggestion}
        </Text>
      </View>

      {/* Grid: Best Focus Time + Boost Subjects */}
      <View className="flex-row space-x-2 mb-3">
        {/* Best Study Time */}
        <View className="flex-1 bg-amber-50/80 p-3 rounded-2xl border border-amber-100 mr-1.5">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs mr-1">⏰</Text>
            <Text className="text-[11px] font-black text-amber-900">Peak Focus</Text>
          </View>
          <Text className="text-xs font-bold text-amber-800 leading-4" numberOfLines={2}>
            {suggestions.bestStudyTime}
          </Text>
        </View>

        {/* Weak Subjects / Need Level-Up */}
        <View className="flex-1 bg-rose-50/80 p-3 rounded-2xl border border-rose-100 ml-1.5">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs mr-1">⚔️</Text>
            <Text className="text-[11px] font-black text-rose-900">Level-Up Needed</Text>
          </View>
          <View className="flex-row flex-wrap gap-1">
            {suggestions.weakSubjects && suggestions.weakSubjects.length > 0 ? (
              suggestions.weakSubjects.map((sub, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => props.onPressSubject?.(sub)}
                  activeOpacity={0.7}
                  className="bg-white/90 px-2 py-0.5 rounded-lg border border-rose-200"
                >
                  <Text className="text-[10px] font-bold text-rose-700">{sub}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-[10px] font-semibold text-rose-600">All subjects balanced! 🌟</Text>
            )}
          </View>
        </View>
      </View>

      {/* Motivational Message */}
      <View className="bg-sky-50/70 p-3 rounded-2xl border border-sky-100 flex-row items-start">
        <Text className="text-base mr-2">💬</Text>
        <Text className="text-xs text-sky-900 font-medium leading-4 flex-1">
          "{suggestions.motivationalMsg}"
        </Text>
      </View>
    </View>
  );
}

export default AISuggestionCard;
