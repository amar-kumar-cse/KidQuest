import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  type User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { TeacherProfile } from '../types';

interface AuthContextType {
  user: User | null;
  teacherProfile: TeacherProfile | null;
  loading: boolean;
  loginAsDemoTeacher: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profileRef = doc(db, 'Users', firebaseUser.uid);
          const snap = await getDoc(profileRef);

          if (snap.exists()) {
            const data = snap.data();
            if (data.role === 'teacher' || data.role === 'admin') {
              setTeacherProfile({
                uid: firebaseUser.uid,
                name: data.name || 'Teacher',
                email: firebaseUser.email || '',
                role: data.role,
                assignedClasses: data.assignedClasses || [],
                teacherOf: data.teacherOf || [],
              });
              setError(null);
            } else {
              setError('Access denied. This portal is strictly for verified school educators.');
              setTeacherProfile(null);
            }
          } else {
            // First time teacher login: setup profile
            const newProfile: TeacherProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Educator',
              email: firebaseUser.email || '',
              role: 'teacher',
              assignedClasses: ['class_science_4a'],
              teacherOf: [],
            };
            await setDoc(profileRef, newProfile, { merge: true });
            setTeacherProfile(newProfile);
            setError(null);
          }
        } catch (err: any) {
          console.warn('[SchoolPortal Auth] Failed reading teacher profile:', err);
          // Fallback mock profile for local development
          setTeacherProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Teacher',
            email: firebaseUser.email || 'teacher@school.edu',
            role: 'teacher',
            assignedClasses: ['class_science_4a'],
            teacherOf: [],
          });
        }
      } else {
        setUser(null);
        setTeacherProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoTeacher = async () => {
    setError(null);
    setLoading(true);
    // Instant demo session
    const mockUser: any = {
      uid: 'teacher_demo_1',
      email: 'frizzle@magicbus.edu',
      displayName: 'Ms. Frizzle',
    };
    setUser(mockUser);
    setTeacherProfile({
      uid: 'teacher_demo_1',
      name: 'Ms. Frizzle',
      email: 'frizzle@magicbus.edu',
      role: 'teacher',
      assignedClasses: ['class_science_4a'],
      teacherOf: ['kid_1', 'kid_2', 'kid_3', 'kid_4'],
    });
    setLoading(false);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Best effort
    }
    setUser(null);
    setTeacherProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        teacherProfile,
        loading,
        login,
        loginAsDemoTeacher,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
