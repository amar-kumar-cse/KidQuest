import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_PIN_KEY = '@kidquest_parent_pin_hash';
const GATE_UNLOCKED_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes session grace period

let sessionUnlockedUntil = 0;

/**
 * Pure TypeScript SHA-256 implementation.
 * Zero external dependencies, runs universally on React Native (Hermes/JSC),
 * Web, and Jest test runner without native module mocks.
 */
export function hashPin(pin: string): string {
  const ascii = `kidquest_salt_${pin}`;
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let formatted = ascii + '\x80';
  while ((formatted.length % 64) - 56) formatted += '\x00';

  for (i = 0; i < formatted.length; i++) {
    j = formatted.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    let currHash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = currHash[0];
      const e = currHash[4];

      const temp1 =
        currHash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & currHash[5]) ^ (~e & currHash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & currHash[1]) ^ (a & currHash[2]) ^ (currHash[1] & currHash[2]));

      currHash = [(temp1 + temp2) | 0].concat(currHash);
      currHash[4] = (currHash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (currHash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }

  return result;
}

export interface MathChallenge {
  question: string;
  answer: number;
}

export const parentalGateService = {
  /**
   * Check if a 4-digit PIN is configured for the parent.
   */
  async hasPinSet(parentUid?: string): Promise<boolean> {
    try {
      const localHash = await AsyncStorage.getItem(STORAGE_PIN_KEY);
      if (localHash) return true;

      if (parentUid) {
        const userDoc = await getDoc(doc(db, 'Users', parentUid));
        if (userDoc.exists() && userDoc.data()?.parentPinHash) {
          await AsyncStorage.setItem(STORAGE_PIN_KEY, userDoc.data().parentPinHash);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Set or update the 4-digit parent PIN.
   */
  async setParentPin(parentUid: string, pin: string): Promise<void> {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits.');
    }
    const hash = hashPin(pin);
    await AsyncStorage.setItem(STORAGE_PIN_KEY, hash);

    if (parentUid) {
      try {
        await updateDoc(doc(db, 'Users', parentUid), {
          parentPinHash: hash,
        });
      } catch (err) {
        console.warn('[parentalGate] Failed to sync PIN to Firestore:', err);
      }
    }
    sessionUnlockedUntil = Date.now() + GATE_UNLOCKED_TIMEOUT_MS;
  },

  /**
   * Verify entered PIN against stored hash.
   */
  async verifyPin(parentUid: string, enteredPin: string): Promise<boolean> {
    if (!/^\d{4}$/.test(enteredPin)) return false;
    const enteredHash = hashPin(enteredPin);

    let storedHash = await AsyncStorage.getItem(STORAGE_PIN_KEY);
    if (!storedHash && parentUid) {
      try {
        const snap = await getDoc(doc(db, 'Users', parentUid));
        if (snap.exists() && snap.data()?.parentPinHash) {
          storedHash = snap.data().parentPinHash;
          if (storedHash) {
            await AsyncStorage.setItem(STORAGE_PIN_KEY, storedHash);
          }
        }
      } catch {
        // Fallback
      }
    }

    if (storedHash && storedHash === enteredHash) {
      sessionUnlockedUntil = Date.now() + GATE_UNLOCKED_TIMEOUT_MS;
      return true;
    }
    return false;
  },

  /**
   * Check if the parental gate was recently unlocked within the 10-minute session grace period.
   */
  isGateRecentlyUnlocked(): boolean {
    return Date.now() < sessionUnlockedUntil;
  },

  /**
   * Explicitly lock the parental gate.
   */
  lockGate(): void {
    sessionUnlockedUntil = 0;
  },

  /**
   * Generate an adult math challenge (multiplication or addition of double digits)
   * designed to block kids under 13 per COPPA/Apple guidelines.
   */
  generateMathChallenge(): MathChallenge {
    const isMultiplication = Math.random() > 0.3;
    if (isMultiplication) {
      const a = Math.floor(Math.random() * 9) + 12; // 12 - 20
      const b = Math.floor(Math.random() * 7) + 4; // 4 - 10
      return {
        question: `What is ${a} × ${b}?`,
        answer: a * b,
      };
    } else {
      const a = Math.floor(Math.random() * 45) + 35; // 35 - 79
      const b = Math.floor(Math.random() * 45) + 25; // 25 - 69
      return {
        question: `What is ${a} + ${b}?`,
        answer: a + b,
      };
    }
  },

  /**
   * Verify math challenge answer.
   */
  verifyMathChallenge(inputAnswer: string | number, expectedAnswer: number): boolean {
    const parsed = typeof inputAnswer === 'number' ? inputAnswer : parseInt(inputAnswer.trim(), 10);
    if (!isNaN(parsed) && parsed === expectedAnswer) {
      sessionUnlockedUntil = Date.now() + GATE_UNLOCKED_TIMEOUT_MS;
      return true;
    }
    return false;
  },
};
