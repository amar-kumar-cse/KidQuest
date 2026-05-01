import * as Speech from 'expo-speech';

export function speak(text: string, options?: { language?: string; pitch?: number; rate?: number }) {
  try {
    Speech.speak(text, { language: options?.language, pitch: options?.pitch, rate: options?.rate });
  } catch (e) {
    console.warn('TTS failed', e);
  }
}
