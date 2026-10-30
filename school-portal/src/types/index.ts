export interface TeacherProfile {
  uid: string;
  name: string;
  email: string;
  role: 'teacher' | 'admin';
  assignedClasses?: string[];
  teacherOf?: string[];
}

export interface ClassData {
  id: string;
  name: string;
  grade: string;
  subject: string;
  teacherUid: string;
  studentUids: string[];
  createdAt?: any;
}

export interface StudentProgress {
  uid: string;
  name: string;
  avatarEmoji?: string;
  totalXp: number;
  xp?: number;
  level: number;
  tasksCompleted: number;
  currentStreak: number;
  status: 'Active' | 'Needs Help' | 'Exceling';
  trend: string;
}

export interface ClassAssignment {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp: number;
  classId?: string;
  assignedToUid: string;
  assignedToName?: string;
  parentId: string; // Teacher UID
  status: 'pending' | 'pending_approval' | 'completed' | 'rejected';
  proofUrl?: string;
  createdAt: any;
  dueDate?: any;
}
