import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PR {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  notes?: string;
}

const EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull Ups', 'Barbell Row'];

export default function PRTracker() {
  const [prs, setPRs] = useState<PR[]>(() => {
    const saved = localStorage.getItem('hardreps_prs');
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exercise: EXERCISES[0], weight: '', reps: '', notes: '' });

  useEffect(() => {
    localStorage.setItem('hardreps_prs', JSON.stringify(prs));
  }, [prs]);

  const addPR = () => {
    if (!form.weight || !form.reps) return;
    const newPR: PR = {
      id: Date.now().toString(),
      exercise: form.exercise,
      weight: parseFloat(form.weight),
      reps: parseInt(form.reps),
      date: new Date().toLocaleDateString('en-IN'),
      notes: form.notes
    };
    setPRs(prev => [newPR, ...prev]);
    setForm({ exercise: EXERCISES[0], weight: '', reps: '', notes: '' });
    setShowForm(false);
  };

  const deletePR = (id: string) => setPRs(prev => prev.filter(p => p.id !== id));

  // Best PR per exercise
  const bestPRs = EXERCISES.map(ex => ({
    exercise: ex,
    best: prs.filter(p => p.exercise === ex).sort((a, b) => b.weight - a.weight)[0]
  })).filter(e => e.best);

  return (
    <div style={{ padding: '48px 20px 120px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase' }}>Personal Records</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>PR Tracker 🏆</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#E8FF6B', color: '#1a1a00', border: 'none', padding: '10px 16px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          + New PR
        </motion.button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid #E8FF6B33' }}
          >
            <select
              value={form.exercise}
              onChange={e => setForm({ ...form, exercise: e.target.value })}
              style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px', marginBottom: 10, fontSize: 14 }}
            >
              {EXERCISES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input
                type="number"
                placeholder="Weight (kg)"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })}
                style={{ background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px', fontSize: 14 }}
              />
              <input
                type="number"
                placeholder="Reps"
                value={form.reps}
                onChange={e => setForm({ ...form, reps: e.target.value })}
                style={{ background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px', fontSize: 14 }}
              />
            </div>
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px', marginBottom: 10, fontSize: 14 }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={addPR}
              style={{ width: '100%', background: '#E8FF6B', color: '#1a1a00', border: 'none', padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Save PR 💪
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Best PRs */}
      {bestPRs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Best Lifts</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {bestPRs.map(({ exercise, best }) => (
              <div key={exercise} style={{ background: '#1a1a1a', borderRadius: 14, padding: 14, border: '1px solid #E8FF6B22' }}>
                <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>{exercise}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#E8FF6B' }}>{best.weight}kg</div>
                <div style={{ fontSize: 11, color: '#888' }}>{best.reps} reps · {best.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All PRs */}
      <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>History</div>
      {prs.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#333', padding: '40px 0', fontSize: 14 }}>No PRs yet. Add your first! 🏋️</div>
      ) : (
        prs.map(pr => (
          <motion.div
            key={pr.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: '#1a1a1a', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{pr.exercise}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#E8FF6B' }}>{pr.weight}kg × {pr.reps}</div>
              <div style={{ fontSize: 10, color: '#555' }}>{pr.date}{pr.notes ? ` · ${pr.notes}` : ''}</div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => deletePR(pr.id)}
              style={{ background: '#ff4444', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}
            >
              Del
            </motion.button>
          </motion.div>
        ))
      )}
    </div>
  );
}