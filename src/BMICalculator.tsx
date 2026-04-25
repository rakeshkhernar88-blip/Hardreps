import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function BMICalculator() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const bmi = weight && height ? parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2) : null;

  const getBMIInfo = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#6B8EFF', tip: 'Protein aur calorie intake badhao.' };
    if (bmi < 25) return { label: 'Normal ✅', color: '#4CAF50', tip: 'Badiya! Aise hi maintain karo.' };
    if (bmi < 30) return { label: 'Overweight', color: '#FF9800', tip: 'Cardio aur diet pe focus karo.' };
    return { label: 'Obese', color: '#FF6B6B', tip: 'Doctor se milao aur routine shuru karo.' };
  };

  // BMR Calculation
  const bmr = weight && height && age ? (
    gender === 'male'
      ? 88.36 + (13.4 * parseFloat(weight)) + (4.8 * parseFloat(height)) - (5.7 * parseFloat(age))
      : 447.6 + (9.2 * parseFloat(weight)) + (3.1 * parseFloat(height)) - (4.3 * parseFloat(age))
  ) : null;

  const info = bmi ? getBMIInfo(bmi) : null;

  return (
    <div style={{ padding: '48px 20px 120px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase' }}>Health Check</div>
        <div style={{ fontSize: 28, fontWeight: 900 }}>BMI Calculator ⚖️</div>
      </div>

      {/* Gender Toggle */}
      <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {(['male', 'female'] as const).map(g => (
          <motion.button
            key={g}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGender(g)}
            style={{
              flex: 1, padding: 10, border: 'none', borderRadius: 10, cursor: 'pointer',
              background: gender === g ? '#E8FF6B' : 'transparent',
              color: gender === g ? '#1a1a00' : '#555',
              fontWeight: 700, fontSize: 13, textTransform: 'capitalize'
            }}
          >
            {g === 'male' ? '♂ Male' : '♀ Female'}
          </motion.button>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Weight', unit: 'kg', value: weight, set: setWeight },
          { label: 'Height', unit: 'cm', value: height, set: setHeight },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 6, textTransform: 'uppercase' }}>{f.label} ({f.unit})</div>
            <input
              type="number"
              placeholder={`0 ${f.unit}`}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              style={{ width: '100%', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: '12px', fontSize: 16, fontWeight: 700 }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#555', marginBottom: 6, textTransform: 'uppercase' }}>Age</div>
        <input
          type="number"
          placeholder="Years"
          value={age}
          onChange={e => setAge(e.target.value)}
          style={{ width: '100%', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 10, padding: '12px', fontSize: 16, fontWeight: 700 }}
        />
      </div>

      {/* BMI Result */}
      {bmi && info && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: '#1a1a1a', borderRadius: 20, padding: 24, marginBottom: 16, border: `1px solid ${info.color}33`, textAlign: 'center' }}
        >
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Your BMI</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: info.color, lineHeight: 1 }}>{bmi.toFixed(1)}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: info.color, marginTop: 8 }}>{info.label}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 12 }}>{info.tip}</div>

          {/* BMI Scale */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 8, marginBottom: 8 }}>
              {[
                { color: '#6B8EFF', width: '25%' },
                { color: '#4CAF50', width: '25%' },
                { color: '#FF9800', width: '25%' },
                { color: '#FF6B6B', width: '25%' },
              ].map((s, i) => (
                <div key={i} style={{ width: s.width, background: s.color }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555' }}>
              <span>Under</span><span>Normal</span><span>Over</span><span>Obese</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* BMR Result */}
      {bmr && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, border: '1px solid #E8FF6B22' }}
        >
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', marginBottom: 12 }}>Daily Calorie Needs (BMR)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Sedentary', cal: bmr * 1.2 },
              { label: 'Light Active', cal: bmr * 1.375 },
              { label: 'Moderate', cal: bmr * 1.55 },
              { label: 'Very Active', cal: bmr * 1.725 },
            ].map(a => (
              <div key={a.label} style={{ background: '#0a0a0a', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#E8FF6B' }}>{Math.round(a.cal)}</div>
                <div style={{ fontSize: 9, color: '#555' }}>kcal/day</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}