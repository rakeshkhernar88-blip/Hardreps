import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Measurement {
  id: string;
  date: string;
  chest: number;
  waist: number;
  hips: number;
  bicep: number;
  thigh: number;
  shoulder: number;
  weight: number;
}

const FIELDS = [
  { key: 'chest', label: 'Chest', unit: 'cm', color: '#E8FF6B' },
  { key: 'waist', label: 'Waist', unit: 'cm', color: '#FF6B6B' },
  { key: 'hips', label: 'Hips', unit: 'cm', color: '#6B8EFF' },
  { key: 'bicep', label: 'Bicep', unit: 'cm', color: '#4CAF50' },
  { key: 'thigh', label: 'Thigh', unit: 'cm', color: '#FF9800' },
  { key: 'shoulder', label: 'Shoulder', unit: 'cm', color: '#9C27B0' },
  { key: 'weight', label: 'Weight', unit: 'kg', color: '#00BCD4' },
];

export default function BodyMeasurements() {
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    const saved = localStorage.getItem('hardreps_measurements');
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ chest: '', waist: '', hips: '', bicep: '', thigh: '', shoulder: '', weight: '' });

  useEffect(() => {
    localStorage.setItem('hardreps_measurements', JSON.stringify(measurements));
  }, [measurements]);

  const addMeasurement = () => {
    const newM: Measurement = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-IN'),
      ...Object.fromEntries(FIELDS.map(f => [f.key, parseFloat(form[f.key]) || 0]))
    } as Measurement;
    setMeasurements(prev => [newM, ...prev]);
    setForm({ chest: '', waist: '', hips: '', bicep: '', thigh: '', shoulder: '', weight: '' });
    setShowForm(false);
  };

  const latest = measurements[0];
  const previous = measurements[1];

  const getDiff = (key: string) => {
    if (!latest || !previous) return null;
    const diff = (latest as any)[key] - (previous as any)[key];
    return diff;
  };

  return (
    <div style={{ padding: '48px 20px 120px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase' }}>Track Your Body</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>Measurements 📏</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#E8FF6B', color: '#1a1a00', border: 'none', padding: '10px 16px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          + Log
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {FIELDS.map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 4, textTransform: 'uppercase' }}>{f.label} ({f.unit})</div>
                  <input
                    type="number"
                    placeholder={`0 ${f.unit}`}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px', fontSize: 14 }}
                  />
                </div>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={addMeasurement}
              style={{ width: '100%', background: '#E8FF6B', color: '#1a1a00', border: 'none', padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Save Measurements 💪
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest Stats */}
      {latest && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Latest — {latest.date}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FIELDS.map(f => {
              const diff = getDiff(f.key);
              return (
                <div key={f.key} style={{ background: '#1a1a1a', borderRadius: 14, padding: 14, border: `1px solid ${f.color}22` }}>
                  <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: f.color }}>{(latest as any)[f.key]} {f.unit}</div>
                  {diff !== null && diff !== 0 && (
                    <div style={{ fontSize: 11, color: diff > 0 ? '#4CAF50' : '#FF6B6B' }}>
                      {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)} {f.unit}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>History</div>
      {measurements.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#333', padding: '40px 0', fontSize: 14 }}>Koi measurement nahi hai. Pehla log karo! 📏</div>
      ) : (
        measurements.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: '#1a1a1a', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #222' }}
          >
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>{m.date}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FIELDS.map(f => (
                <div key={f.key} style={{ fontSize: 12 }}>
                  <span style={{ color: '#555' }}>{f.label}: </span>
                  <span style={{ color: f.color, fontWeight: 700 }}>{(m as any)[f.key]}{f.unit}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}