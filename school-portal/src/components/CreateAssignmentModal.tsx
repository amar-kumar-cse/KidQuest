import React, { useState } from 'react';
import type { StudentProgress } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: StudentProgress[];
  onSave: (assignment: {
    title: string;
    description: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    xp: number;
    assignedToUid: string;
  }) => Promise<void>;
}

export const CreateAssignmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  students,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('homework');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [xp, setXp] = useState(50);
  const [targetStudent, setTargetStudent] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);
    try {
      if (targetStudent === 'all') {
        // Create for all students
        for (const s of students) {
          await onSave({
            title,
            description,
            category,
            difficulty,
            xp,
            assignedToUid: s.uid,
          });
        }
      } else {
        await onSave({
          title,
          description,
          category,
          difficulty,
          xp,
          assignedToUid: targetStudent,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Assign Classroom Quest 📝</h3>
            <p className="text-xs text-slate-500 mt-0.5">Award XP and track completion for your students</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Quest Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solar System Planet Model"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Instructions / Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide guidelines, submission format, or rubric..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="homework">📚 Homework</option>
                <option value="reading">📖 Reading</option>
                <option value="creative">🎨 Creative</option>
                <option value="exercise">🏃 Exercise</option>
                <option value="kindness">🤝 Kindness</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="easy">Easy (1x)</option>
                <option value="medium">Medium (1.5x)</option>
                <option value="hard">Hard (2x)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reward (XP)
              </label>
              <input
                type="number"
                min={10}
                max={500}
                value={xp}
                onChange={(e) => setXp(parseInt(e.target.value) || 50)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assign To
            </label>
            <select
              value={targetStudent}
              onChange={(e) => setTargetStudent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="all">🌟 Entire Classroom ({students.length} Students)</option>
              {students.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.avatarEmoji || '👦'} {s.name} (Lvl {s.level})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Quest ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
