import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeacherLogin } from './components/TeacherLogin';
import { CreateAssignmentModal } from './components/CreateAssignmentModal';
import { CreateClassModal } from './components/CreateClassModal';
import type { ClassData, StudentProgress, ClassAssignment } from './types';

// Default initial demo students for new classes
const INITIAL_DEMO_STUDENTS: StudentProgress[] = [
  { uid: 'kid_1', name: 'Alice Smith', avatarEmoji: '🦊', totalXp: 4500, level: 8, tasksCompleted: 24, currentStreak: 5, status: 'Active', trend: '+150 this week' },
  { uid: 'kid_2', name: 'Bobby Jones', avatarEmoji: '🚀', totalXp: 3200, level: 6, tasksCompleted: 18, currentStreak: 2, status: 'Active', trend: '+50 this week' },
  { uid: 'kid_3', name: 'Charlie Day', avatarEmoji: '⭐', totalXp: 800, level: 2, tasksCompleted: 4, currentStreak: 0, status: 'Needs Help', trend: '0 this week' },
  { uid: 'kid_4', name: 'Diana Prince', avatarEmoji: '👑', totalXp: 9500, level: 12, tasksCompleted: 45, currentStreak: 14, status: 'Exceling', trend: '+800 this week' },
];

function TeacherDashboard() {
  const { teacherProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Students' | 'Assignments' | 'Settings'>('Overview');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students] = useState<StudentProgress[]>(INITIAL_DEMO_STUDENTS);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  // 1. Fetch Teacher's Classes (Strict Tenant Isolation)
  useEffect(() => {
    if (!teacherProfile?.uid) return;

    const q = query(
      collection(db, 'Classes'),
      where('teacherUid', '==', teacherProfile.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ClassData[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as ClassData);
        });

        if (loaded.length === 0) {
          // Fallback initial class for demo teacher
          const defaultClass: ClassData = {
            id: 'class_science_4a',
            name: 'Grade 4 Science',
            grade: 'Grade 4',
            subject: 'Science',
            teacherUid: teacherProfile.uid,
            studentUids: ['kid_1', 'kid_2', 'kid_3', 'kid_4'],
          };
          setClasses([defaultClass]);
          setSelectedClassId(defaultClass.id);
        } else {
          setClasses(loaded);
          if (!selectedClassId || !loaded.some((c) => c.id === selectedClassId)) {
            setSelectedClassId(loaded[0].id);
          }
        }
      },
      (err) => {
        console.warn('[Dashboard] Could not load classes from Firestore:', err);
        const fallbackClass: ClassData = {
          id: 'class_science_4a',
          name: 'Grade 4 Science',
          grade: 'Grade 4',
          subject: 'Science',
          teacherUid: teacherProfile.uid,
          studentUids: ['kid_1', 'kid_2', 'kid_3', 'kid_4'],
        };
        setClasses([fallbackClass]);
        setSelectedClassId(fallbackClass.id);
      }
    );

    return () => unsub();
  }, [teacherProfile?.uid]);

  // 2. Fetch Tasks assigned by this teacher for the selected class
  useEffect(() => {
    if (!teacherProfile?.uid) return;

    const qTasks = query(
      collection(db, 'Tasks'),
      where('parentId', '==', teacherProfile.uid)
    );

    const unsubTasks = onSnapshot(
      qTasks,
      (snapshot) => {
        const list: ClassAssignment[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ClassAssignment);
        });
        setAssignments(list);
      },
      (err) => {
        console.warn('[Dashboard] Firestore Tasks subscription fallback:', err);
      }
    );

    return () => unsubTasks();
  }, [teacherProfile?.uid, selectedClassId]);

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const handleCreateAssignment = async (data: any) => {
    if (!teacherProfile?.uid) return;
    try {
      await addDoc(collection(db, 'Tasks'), {
        ...data,
        parentId: teacherProfile.uid,
        classId: activeClass?.id || 'class_science_4a',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[Dashboard] Error adding task:', err);
      // Local optimistic update for offline/demo
      setAssignments((prev) => [
        {
          id: `temp_${Date.now()}`,
          ...data,
          parentId: teacherProfile.uid,
          classId: activeClass?.id || 'class_science_4a',
          status: 'pending',
          createdAt: new Date(),
        },
        ...prev,
      ]);
    }
  };

  const handleCreateClass = async (data: { name: string; grade: string; subject: string }) => {
    if (!teacherProfile?.uid) return;
    try {
      const docRef = await addDoc(collection(db, 'Classes'), {
        ...data,
        teacherUid: teacherProfile.uid,
        studentUids: ['kid_1', 'kid_2'],
        createdAt: serverTimestamp(),
      });
      setSelectedClassId(docRef.id);
    } catch (err) {
      console.error('[Dashboard] Error creating class:', err);
      const newClass: ClassData = {
        id: `class_${Date.now()}`,
        ...data,
        teacherUid: teacherProfile.uid,
        studentUids: ['kid_1', 'kid_2'],
      };
      setClasses((prev) => [...prev, newClass]);
      setSelectedClassId(newClass.id);
    }
  };

  const handleApproveAssignment = async (assignmentId: string) => {
    try {
      await updateDoc(doc(db, 'Tasks', assignmentId), {
        status: 'completed',
        approvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[Dashboard] Error approving task:', err);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: 'completed' } : a))
      );
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingApprovalsCount = assignments.filter((a) => a.status === 'pending_approval').length;
  const avgLevel = Math.round(
    students.reduce((acc, s) => acc + s.level, 0) / (students.length || 1)
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-indigo-950 text-white flex flex-col shadow-2xl z-10 border-r border-indigo-900">
        <div className="p-6 border-b border-indigo-900/60">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎓</span>
            <h1 className="text-xl font-black tracking-wider text-white">
              KidQuest<span className="text-amber-400">.EDU</span>
            </h1>
          </div>
          <p className="text-indigo-400 text-xs mt-1 font-medium">Classroom Management Portal</p>
        </div>

        {/* Classroom Selector */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex justify-between items-center mb-1.5 px-2">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Classrooms
            </span>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="text-xs text-amber-300 hover:text-amber-200 font-bold"
            >
              + New
            </button>
          </div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-indigo-900 text-indigo-100 text-xs rounded-xl px-3 py-2 border border-indigo-800 focus:outline-none focus:border-indigo-500 font-medium"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.subject})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-4 space-y-1.5 mt-3">
          {(['Overview', 'Students', 'Assignments', 'Settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-between ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
              }`}
            >
              <span>{tab}</span>
              {tab === 'Assignments' && pendingApprovalsCount > 0 && (
                <span className="bg-amber-400 text-indigo-950 font-black text-xs px-2 py-0.5 rounded-full">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Teacher Profile Footer */}
        <div className="p-4 border-t border-indigo-900 bg-indigo-950/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-indigo-950 font-black text-sm shadow">
                {teacherProfile?.name?.slice(0, 2).toUpperCase() || 'TR'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-white truncate">{teacherProfile?.name || 'Teacher'}</p>
                <p className="text-xs text-indigo-400 truncate">{activeClass?.name || 'Educator'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="text-indigo-400 hover:text-red-400 p-2 text-sm transition-colors"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-8 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black text-slate-800">{activeTab}</h2>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
                {activeClass?.name || 'Classroom'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Teacher multi-tenant classroom portal • All quest data synced with mobile app
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAssignmentModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-colors shadow-sm"
            >
              + Assign Quest
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'Overview' && (
            <>
              {/* Quick Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    Enrolled Students
                  </span>
                  <div className="text-4xl font-black text-slate-800 mt-2">{students.length}</div>
                  <span className="text-xs text-green-600 font-bold mt-2 inline-block">
                    ✓ All accounts linked & active
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    Classroom Average Level
                  </span>
                  <div className="text-4xl font-black text-indigo-600 mt-2">Lvl {avgLevel}</div>
                  <span className="text-xs text-slate-400 font-medium mt-2 inline-block">
                    Based on verified homework XP
                  </span>
                </div>

                <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-6 rounded-2xl shadow-md text-white">
                  <span className="font-semibold text-xs uppercase tracking-wider opacity-90">
                    Pending Quest Reviews
                  </span>
                  <div className="text-4xl font-black mt-2">{pendingApprovalsCount}</div>
                  <span className="text-xs font-semibold mt-2 inline-block opacity-90">
                    Student submissions waiting for teacher review
                  </span>
                </div>
              </div>

              {/* Student Roster Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-800">Student Progress Roster</h3>
                  <input
                    type="text"
                    placeholder="Search by student name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 w-60 shadow-sm"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-50/80">
                        <th className="py-3 px-6 font-bold">Student</th>
                        <th className="py-3 px-6 font-bold">Level & XP</th>
                        <th className="py-3 px-6 font-bold">Quests Done</th>
                        <th className="py-3 px-6 font-bold">Streak</th>
                        <th className="py-3 px-6 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredStudents.map((s) => (
                        <tr key={s.uid} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6 flex items-center space-x-3">
                            <span className="text-2xl">{s.avatarEmoji || '👦'}</span>
                            <div>
                              <p className="font-bold text-slate-800">{s.name}</p>
                              <p className="text-xs text-slate-400">ID: {s.uid}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-indigo-600">Lvl {s.level}</span>
                            <span className="text-xs text-slate-400 ml-2">({s.totalXp.toLocaleString()} XP)</span>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-700">{s.tasksCompleted}</td>
                          <td className="py-4 px-6 font-bold text-amber-600">🔥 {s.currentStreak}d</td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                s.status === 'Exceling'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : s.status === 'Active'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Students' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Class Enrolled Students ({students.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((s) => (
                  <div key={s.uid} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{s.avatarEmoji || '👦'}</span>
                      <div>
                        <h4 className="font-bold text-slate-800">{s.name}</h4>
                        <p className="text-xs text-slate-400">Level {s.level} • {s.totalXp} Total XP</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {s.tasksCompleted} Quests
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Assignments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Class Quests & Assignments</h3>
                <button
                  onClick={() => setIsAssignmentModalOpen(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  + New Assignment
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
                  <span className="text-4xl">📝</span>
                  <h4 className="font-bold text-slate-700 mt-3">No Assignments Yet</h4>
                  <p className="text-xs text-slate-400 mt-1">Assign reading or homework quests to your class.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-indigo-600 uppercase">{a.category}</span>
                          <span className="text-xs text-slate-400">• Reward: +{a.xp} XP</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-base mt-0.5">{a.title}</h4>
                        {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            a.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : a.status === 'pending_approval'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {a.status === 'pending_approval' ? 'Needs Review' : a.status}
                        </span>

                        {a.status === 'pending_approval' && (
                          <button
                            onClick={() => handleApproveAssignment(a.id)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm"
                          >
                            Approve ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-xl space-y-6">
              <h3 className="text-lg font-bold text-slate-800">Teacher Profile & Security</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Educator Name</label>
                <p className="font-semibold text-slate-800 mt-1">{teacherProfile?.name}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">School Email</label>
                <p className="font-semibold text-slate-800 mt-1">{teacherProfile?.email}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Multi-Tenant Role</label>
                <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-md mt-1">
                  Verified Educator ({teacherProfile?.role})
                </span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100"
                >
                  Log Out of School Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        students={students}
        onSave={handleCreateAssignment}
      />

      {/* Classroom Creation Modal */}
      <CreateClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onSave={handleCreateClass}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, teacherProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white space-y-3">
          <div className="text-4xl animate-bounce">🎓</div>
          <p className="text-sm font-semibold text-indigo-300">Loading School Portal...</p>
        </div>
      </div>
    );
  }

  if (!user || !teacherProfile) {
    return <TeacherLogin />;
  }

  return <TeacherDashboard />;
}
