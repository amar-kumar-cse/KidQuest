import { create } from 'zustand';

export interface StudySuggestions {
  weakSubjects: string[];
  bestStudyTime: string;
  todaySuggestion: string;
  motivationalMsg: string;
  updatedAt?: any;
}

export interface SuggestionState {
  suggestions: StudySuggestions | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  setSuggestions: (suggestions: StudySuggestions | null) => void;
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSuggestionStore = create<SuggestionState>((set) => ({
  suggestions: null,
  isLoading: true,
  isGenerating: false,
  error: null,

  setSuggestions: (suggestions) => set({ suggestions, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error, isLoading: false, isGenerating: false }),
  reset: () => set({ suggestions: null, isLoading: false, isGenerating: false, error: null }),
}));

export default useSuggestionStore;
