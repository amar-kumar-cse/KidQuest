import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: 'task_submitted' | 'task_approved' | 'task_rejected' | 'reward_claimed';
  title: string;
  body: string;
  createdAt: any;
  isRead: boolean;
  taskId?: string;
  rewardId?: string;
  xpAwarded?: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'Notifications'),
      where('recipientId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<AppNotification, 'id'>;
        notifs.push({ id: docSnap.id, ...data });
        if (!data.isRead) unread++;
      });

      setNotifications(notifs);
      setUnreadCount(unread);
      setLoading(false);
    }, (error) => {
      console.warn('[useNotifications] Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'Notifications', id), { isRead: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.isRead);
      if (unreadNotifs.length === 0) return;

      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        batch.update(doc(db, 'Notifications', n.id), { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
