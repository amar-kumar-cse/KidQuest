import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TaskData, TaskStatus } from '../lib/firestoreService';

export interface AssignedTask extends TaskData {
  id: string;
}

export function useTasks(role: 'parent' | 'kid', uid: string | undefined, statuses: TaskStatus[]) {
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || statuses.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const baseField = role === 'parent' ? 'parentId' : 'assignedToUid';
    
    // Firestore 'in' query works up to 10 items. We use it for statuses array.
    const q = query(
      collection(db, 'Tasks'),
      where(baseField, '==', uid),
      where('status', 'in', statuses)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTasks: AssignedTask[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedTasks.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as AssignedTask);
      });
      
      // Sort tasks by creation or completion date locally to avoid composite index requirement
      fetchedTasks.sort((a, b) => {
        const timeA = a.completedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const timeB = b.completedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA; // Descending
      });

      setTasks(fetchedTasks);
      setLoading(false);
    }, (error) => {
      console.error('[useTasks] Error fetching tasks:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [role, uid, JSON.stringify(statuses)]);

  return { tasks, loading };
}
