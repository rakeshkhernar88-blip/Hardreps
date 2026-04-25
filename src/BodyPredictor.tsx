/**
 * BodyPredictor.tsx
 * HardReps — React + Vite + Capacitor + TypeScript
 *
 * DROP-IN: src/BodyPredictor.tsx
 *
 * App.tsx mein ye 4 changes karo:
 *   1. import BodyPredictor from './BodyPredictor';
 *   2. ViewType: type ViewType = ... | 'predictor';
 *   3. NAV_ITEMS: { id:'predictor', label:'PREDICT', icon:'🔮' }
 *   4. JSX: {currentView==='predictor' && <BodyPredictor userProfile={userProfile} />}
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile } from './ProfileSetup';

// ─── Types ────────────────────────────────────────────────────────────────────

type MuscleKey    = 'bicep' | 'chest' | 'shoulder' | 'back' | 'legs' | 'forearm' | 'calf';
type LevelKey     = 'beginner' | 'intermediate' | 'advanced';
type NutritionKey = 'bulk' | 'maintain' | 'cut';
type AgeGroup     = '20s' | '30s' | '40s' | '45+';
type ProteinKey   = 'high' | 'moderate' | 'low';
type StressKey    = 'low' | 'moderate' | 'high';

interface PredictorInput {
  muscle:      MuscleKey;
  currentSize: number;
  targetSize:  number;
  level:       LevelKey;
  nutrition:   NutritionKey;
  daysPerWeek: number;
  ageGroup:    AgeGroup;
  protein:     ProteinKey;
  stress:      StressKey;
}

interface Milestone { month: number; main: number; best: number; worst: number; }

interface PredictionResult {
  months:      number;
  monthlyGain: number;
  milestones:  Milestone[];
  multiplier:  number;
}

interface WeeklyCheckin { gymDays: number; sleepStars: number; dietStars: number; }

// ─── Storage ─────────────────────────────────────────────────────────────────

const PRED_KEY = 'hardreps_predictor_v1';
const CI_KEY   = 'hardreps_checkin_v1';

const loadPredictor = (): Partial<PredictorInput> => {
  try { return JSON.parse(localStorage.getItem(PRED_KEY) || '{}'); } catch { return {}; }
};
const savePredictor = (d: Partial<PredictorInput>) => {
  try { localStorage.setItem(PRED_KEY, JSON.stringify(d)); } catch { /**/ }
};
const loadCheckin = (): WeeklyCheckin => {
  try { return JSON.parse(localStorage.getItem(CI_KEY) || 'null') || { gymDays: 3, sleepStars: 3, dietStars: 3 }; }
  catch { return { gymDays: 3, sleepStars: 3, dietStars: 3 }; }
};
const saveCheckin = (c: WeeklyCheckin) => {
  try { localStorage.setItem(CI_KEY, JSON.stringify(c)); } catch { /**/ }
};

// ─── Algorithm ────────────────────────────────────────────────────────────────

const BASE: Record<MuscleKey, Record<LevelKey, number>> = {
  bicep:    { beginner: 0.30, intermediate: 0.15, advanced: 0.07 },
  chest:    { beginner: 0.80, intermediate: 0.40, advanced: 0.20 },
  shoulder: { beginner: 0.50, intermediate: 0.25, advanced: 0.12 },
  back:     { beginner: 0.60, intermediate: 0.30, advanced: 0.15 },
  legs:     { beginner: 1.00, intermediate: 0.50, advanced: 0.25 },
  forearm:  { beginner: 0.25, intermediate: 0.12, advanced: 0.06 },
  calf:     { beginner: 0.40, intermediate: 0.20, advanced: 0.10 },
};

const NUT_M:  Record<NutritionKey, number> = { bulk: 1.2, maintain: 1.0, cut: 0.5  };
const AGE_M:  Record<AgeGroup,     number> = { '20s': 1.3, '30s': 1.0, '40s': 0.8, '45+': 0.6 };
const PRO_M:  Record<ProteinKey,   number> = { high: 1.2, moderate: 1.0, low: 0.7  };
const STR_M:  Record<StressKey,    number> = { low: 1.1, moderate: 1.0, high: 0.7  };
const FREQ_M  = (d: number) => d <= 1 ? 0.6 : d === 2 ? 0.85 : d === 3 ? 1.0 : d === 4 ? 1.1 : 1.15;
const SLEEP_M = (s: number) => [0.5, 0.7, 0.9, 1.2, 1.3][s - 1] ?? 1.0;
const DIET_M  = (s: number) => [0.6, 0.75, 0.9, 1.05, 1.2][s - 1] ?? 1.0;
const DECAY   = 0.92;

const runPredict = (inp: PredictorInput, ci: WeeklyCheckin): PredictionResult => {
  const base = BASE[inp.muscle][inp.level];
  const mult =
    NUT_M[inp.nutrition] * AGE_M[inp.ageGroup] * PRO_M[inp.protein] *
    STR_M[inp.stress] * FREQ_M(inp.daysPerWeek) *
    SLEEP_M(ci.sleepStars) * DIET_M(ci.dietStars) * FREQ_M(ci.gymDays);

  const diff      = Math.max(0.1, inp.targetSize - inp.currentSize);
  const miles: Milestone[] = [];
  let cum  = 0;
  let rate = base * mult;
  let month = 0;

  while (cum < diff && month < 72) {
    month++;
    rate *= DECAY;
    cum = Math.min(cum + rate, diff);
    miles.push({
      month,
      main:  +(inp.currentSize + cum).toFixed(1),
      best:  +(inp.currentSize + cum + rate * 0.2).toFixed(1),
      worst: +(inp.currentSize + cum - rate * 0.15).toFixed(1),
    });
    if (inp.currentSize + cum >= inp.targetSize) break;
  }

  return { months: month, monthlyGain: +(base * mult).toFixed(2), milestones: miles, multiplier: +mult.toFixed(2) };
};

// ─── Gemini ───────────────────────────────────────────────────────────────────

const callGemini = async (prompt: string): Promise<string> => {
  const key = (import.meta as any).env?.VITE_GEMINI_API_KEY ?? 'AIzaSyBTfKGBgkp7xxaxWMa5Lg0fVektzd4j5S0';
  if (!key) return '⚠️ VITE_GEMINI_API_KEY .env mein set nahi hai.';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response.';
};

// ─── UI Constants ─────────────────────────────────────────────────────────────

const MUSCLES = [
  { key: 'bicep' as MuscleKey,    label: 'Bicep',    icon: '💪' },
  { key: 'chest' as MuscleKey,    label: 'Chest',    icon: '🏋️' },
  { key: 'shoulder' as MuscleKey, label: 'Shoulder', icon: '🏔️' },
  { key: 'back' as MuscleKey,     label: 'Back',     icon: '🔙' },
  { key: 'legs' as MuscleKey,     label: 'Legs',     icon: '🦵' },
  { key: 'forearm' as MuscleKey,  label: 'Forearm',  icon: '🤜' },
  { key: 'calf' as MuscleKey,     label: 'Calf',     icon: '🏃' },
];

const LEVELS = [
  { key: 'beginner' as LevelKey,     label: '🌱 Beginner',     sub: '<1 yr'   },
  { key: 'intermediate' as LevelKey, label: '⚡ Intermediate', sub: '1-3 yrs' },
  { key: 'advanced' as LevelKey,     label: '🏆 Advanced',     sub: '3+ yrs'  },
];

const NUTRITIONS = [
  { key: 'bulk' as NutritionKey,     label: '🍗 Bulk',     mult: '1.2×', color: '#E8FF6B' },
  { key: 'maintain' as NutritionKey, label: '⚖️ Maintain', mult: '1.0×', color: '#6B8EFF' },
  { key: 'cut' as NutritionKey,      label: '🥗 Cut',      mult: '0.5×', color: '#FF6B6B' },
];

const AGE_GROUPS = [
  { key: '20s' as AgeGroup, label: '20s', color: '#E8FF6B' },
  { key: '30s' as AgeGroup, label: '30s', color: '#6BFF9E' },
  { key: '40s' as AgeGroup, label: '40s', color: '#FBBC04' },
  { key: '45+' as AgeGroup, label: '45+', color: '#FF6B6B' },
];

const PROTEINS = [
  { key: 'high' as ProteinKey,     label: '🥩 High (2g/kg)'    },
  { key: 'moderate' as ProteinKey, label: '🍳 Moderate (1.5g)' },
  { key: 'low' as ProteinKey,      label: '🥙 Low (<1g)'       },
];

const STRESSES = [
  { key: 'low' as StressKey,      label: '😌 Low',      color: '#6BFF9E' },
  { key: 'moderate' as StressKey, label: '😐 Moderate', color: '#E8FF6B' },
  { key: 'high' as StressKey,     label: '😤 High',     color: '#FF6B6B' },
];

// ─── Shared style helpers ─────────────────────────────────────────────────────

const card = (border = '#1a1a1a'): React.CSSProperties => ({
  background: '#111', borderRadius: 20, padding: 16,
  border: `1px solid ${border}`, marginBottom: 14,
});
const lbl: React.CSSProperties = {
  fontSize: 10, color: '#555', letterSpacing: 1.5,
  textTransform: 'uppercase', marginBottom: 8, display: 'block',
};
const chip = (active: boolean, color = '#E8FF6B'): React.CSSProperties => ({
  background: active ? `${color}22` : '#1a1a1a',
  border: `1px solid ${active ? color : '#222'}`,
  borderRadius: 12, padding: '9px 14px', fontSize: 12,
  fontWeight: active ? 700 : 400, color: active ? color : '#555', cursor: 'pointer',
});
const inp_style: React.CSSProperties = {
  width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};
const btn_style = (bg = '#E8FF6B', color = '#1a1a00'): React.CSSProperties => ({
  width: '100%', background: bg, color, border: 'none',
  borderRadius: 14, padding: '14px 0', fontSize: 14,
  fontWeight: 800, cursor: 'pointer',
});

type TabKey = 'setup' | 'result' | 'checkin';

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { userProfile?: UserProfile | null; }

export default function BodyPredictor({ userProfile }: Props) {
  const saved = loadPredictor();

  const derivedAge = (): AgeGroup => {
    if (!userProfile?.age) return '20s';
    if (userProfile.age < 30) return '20s';
    if (userProfile.age < 40) return '30s';
    if (userProfile.age < 45) return '40s';
    return '45+';
  };

  const [tab, setTab]       = useState<TabKey>('setup');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const [ciSaved, setCiSaved] = useState(false);

  const [inp, setInp] = useState<PredictorInput>({
    muscle:      (saved.muscle      ?? 'bicep')       as MuscleKey,
    currentSize:  saved.currentSize ?? 30,
    targetSize:   saved.targetSize  ?? 36,
    level:       (saved.level       ?? (userProfile?.fitnessLevel as LevelKey ?? 'beginner')),
    nutrition:   (saved.nutrition   ?? 'maintain')    as NutritionKey,
    daysPerWeek:  saved.daysPerWeek ?? 3,
    ageGroup:    (saved.ageGroup    ?? derivedAge()),
    protein:     (saved.protein     ?? 'moderate')    as ProteinKey,
    stress:      (saved.stress      ?? 'moderate')    as StressKey,
  });

  const [ci, setCi] = useState<WeeklyCheckin>(loadCheckin());

  const set = useCallback(<K extends keyof PredictorInput>(k: K, v: PredictorInput[K]) => {
    setInp(p => { const n = { ...p, [k]: v }; savePredictor(n); return n; });
  }, []);

  const valid = inp.targetSize > inp.currentSize && inp.currentSize > 0;
  const diff  = inp.targetSize - inp.currentSize;

  const handlePredict = () => {
    if (!valid) return;
    setResult(runPredict(inp, ci));
    setTab('result');
  };

  const handleCiSave = () => {
    saveCheckin(ci);
    if (result) setResult(runPredict(inp, ci));
    setCiSaved(true);
    setTimeout(() => setCiSaved(false), 2000);
  };

  const handleAI = async () => {
    if (!result) return;
    setAiLoad(true); setAiText('');
    try {
      const t = await callGemini(
        `No-BS fitness coach. 2-3 lines, plain text, Hindi/Hinglish ok.
Muscle: ${inp.muscle}, ${inp.currentSize}→${inp.targetSize}cm.
Prediction: ${result.months} months, ${result.monthlyGain}cm/month. Multiplier: ${result.multiplier}.
Checkin: Gym ${ci.gymDays}d, Sleep ${ci.sleepStars}★, Diet ${ci.dietStars}★.
1 key insight + 1 actionable tip. Be direct.`
      );
      setAiText(t);
    } catch (e: any) {
      setAiText(`Error: ${e.message}`);
    } finally {
      setAiLoad(false);
    }
  };

  const chartMiles = useMemo(() => {
    if (!result) return [];
    const step = Math.ceil(result.milestones.length / 6);
    return result.milestones.filter((_, i) => i % step === 0 || i === result.milestones.length - 1);
  }, [result]);

  const liveMonths = useMemo(() => runPredict(inp, ci).months, [inp, ci]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '48px 20px 120px', minHeight: '100vh', background: '#0D0D0D', color: '#fff', maxWidth: 390, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>AI-Powered</div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>Body Predictor 🔮</div>
        <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Non-linear muscle growth algorithm</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#111', borderRadius: 14, padding: 4, border: '1px solid #1a1a1a' }}>
        {([['setup', '⚙️ Setup'], ['result', '📈 Result'], ['checkin', '✅ Check-in']] as [TabKey, string][]).map(([t, l]) => (
          <motion.button key={t} whileTap={{ scale: 0.95 }} onClick={() => setTab(t)}
            style={{ flex: 1, background: tab === t ? '#E8FF6B' : 'transparent', color: tab === t ? '#1a1a00' : '#555', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 11, fontWeight: tab === t ? 800 : 400, cursor: 'pointer' }}>
            {l}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════ SETUP ══════════════ */}
        {tab === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>

            {/* Muscle */}
            <div style={card()}>
              <span style={lbl}>Muscle Group</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MUSCLES.map(m => (
                  <motion.button key={m.key} whileTap={{ scale: 0.9 }} onClick={() => set('muscle', m.key)} style={chip(inp.muscle === m.key)}>
                    {m.icon} {m.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div style={card()}>
              <span style={lbl}>Measurements (cm)</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Current Size</div>
                  <input type="number" value={inp.currentSize || ''} min={10} max={100}
                    onChange={e => set('currentSize', +e.target.value)} style={inp_style} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Target Size</div>
                  <input type="number" value={inp.targetSize || ''} min={10} max={100}
                    onChange={e => set('targetSize', +e.target.value)}
                    style={{ ...inp_style, borderColor: valid ? '#E8FF6B44' : inp.targetSize <= inp.currentSize ? '#FF6B6B44' : '#2a2a2a' }} />
                </div>
              </div>
              {valid && <div style={{ marginTop: 10, fontSize: 11, color: '#E8FF6B', fontWeight: 700 }}>Gap: +{diff.toFixed(1)} cm 💪</div>}
            </div>

            {/* Level */}
            <div style={card()}>
              <span style={lbl}>Training Level</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LEVELS.map(l => (
                  <motion.button key={l.key} whileTap={{ scale: 0.98 }} onClick={() => set('level', l.key)}
                    style={{ ...chip(inp.level === l.key), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{l.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>{l.sub}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Nutrition */}
            <div style={card()}>
              <span style={lbl}>Current Diet</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {NUTRITIONS.map(n => (
                  <motion.button key={n.key} whileTap={{ scale: 0.92 }} onClick={() => set('nutrition', n.key)}
                    style={{ ...chip(inp.nutrition === n.key, n.color), flex: 1, textAlign: 'center' as const }}>
                    <div>{n.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{n.mult}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Days per week */}
            <div style={card()}>
              <span style={lbl}>Gym Days / Week: <strong style={{ color: '#E8FF6B' }}>{inp.daysPerWeek}</strong></span>
              <input type="range" min={1} max={7} value={inp.daysPerWeek}
                onChange={e => set('daysPerWeek', +e.target.value)}
                style={{ width: '100%', accentColor: '#E8FF6B' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444', marginTop: 4 }}>
                {[1,2,3,4,5,6,7].map(d => (
                  <span key={d} style={{ color: d === inp.daysPerWeek ? '#E8FF6B' : '#444', fontWeight: d === inp.daysPerWeek ? 700 : 400 }}>{d}</span>
                ))}
              </div>
            </div>

            {/* Age + Protein + Stress */}
            <div style={card()}>
              <span style={lbl}>Age Group</span>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {AGE_GROUPS.map(a => (
                  <motion.button key={a.key} whileTap={{ scale: 0.9 }} onClick={() => set('ageGroup', a.key)}
                    style={{ ...chip(inp.ageGroup === a.key, a.color), flex: 1, textAlign: 'center' as const }}>{a.label}</motion.button>
                ))}
              </div>

              <span style={lbl}>Protein Intake</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {PROTEINS.map(p => (
                  <motion.button key={p.key} whileTap={{ scale: 0.98 }} onClick={() => set('protein', p.key)} style={chip(inp.protein === p.key)}>{p.label}</motion.button>
                ))}
              </div>

              <span style={lbl}>Stress Level</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {STRESSES.map(s => (
                  <motion.button key={s.key} whileTap={{ scale: 0.92 }} onClick={() => set('stress', s.key)}
                    style={{ ...chip(inp.stress === s.key, s.color), flex: 1, textAlign: 'center' as const, fontSize: 11 }}>{s.label}</motion.button>
                ))}
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={handlePredict} disabled={!valid}
              style={{ ...btn_style(), opacity: valid ? 1 : 0.4, marginTop: 4 }}>
              🔮 Predict My Growth
            </motion.button>
          </motion.div>
        )}

        {/* ══════════════ RESULT ══════════════ */}
        {tab === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            {!result ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                <div style={{ fontSize: 50, marginBottom: 16 }}>🔮</div>
                <div style={{ fontSize: 14 }}>Setup tab mein details bharo aur Predict karo!</div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab('setup')}
                  style={{ ...btn_style(), marginTop: 20, maxWidth: 200, margin: '20px auto 0' }}>→ Setup Karo</motion.button>
              </div>
            ) : (
              <>
                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'linear-gradient(135deg,#0d2a0a,#1a2a0a)', borderRadius: 24, padding: 22, border: '1px solid #E8FF6B22', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#E8FF6B', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                    {MUSCLES.find(m => m.key === inp.muscle)?.icon} {inp.muscle.toUpperCase()} PREDICTION
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 56, fontWeight: 900, color: '#E8FF6B', letterSpacing: -2, lineHeight: 1 }}>{result.months}</div>
                      <div style={{ fontSize: 13, color: '#8A9A00', marginTop: 4 }}>months to {inp.targetSize}cm</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#6BFF9E' }}>+{result.monthlyGain}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>cm/month (Month 1)</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, background: '#0a0a0a', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((inp.currentSize / inp.targetSize) * 100, 100)}%` }}
                      transition={{ duration: 1.2 }}
                      style={{ height: '100%', background: 'linear-gradient(90deg,#22c55e,#E8FF6B)', borderRadius: 8 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#555' }}>
                    <span>Now: {inp.currentSize}cm</span>
                    <span style={{ color: '#E8FF6B', fontWeight: 700 }}>Goal: {inp.targetSize}cm</span>
                  </div>
                </motion.div>

                {/* Multiplier Breakdown */}
                <div style={card()}>
                  <div style={{ ...lbl, marginBottom: 12 }}>Growth Multiplier Breakdown</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {([
                      ['Nutrition', NUT_M[inp.nutrition],       '#E8FF6B'],
                      ['Age',       AGE_M[inp.ageGroup],        '#6B8EFF'],
                      ['Protein',   PRO_M[inp.protein],         '#6BFF9E'],
                      ['Stress',    STR_M[inp.stress],          '#FF6B6B'],
                      ['Frequency', FREQ_M(inp.daysPerWeek),    '#FBBC04'],
                      ['Sleep ★',  SLEEP_M(ci.sleepStars),     '#c084fc'],
                      ['Diet ★',   DIET_M(ci.dietStars),       '#22d3ee'],
                    ] as [string, number, string][]).map(([label, val, color]) => (
                      <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color }}>{val.toFixed(2)}×</div>
                      </div>
                    ))}
                    <div style={{ background: '#E8FF6B22', border: '1px solid #E8FF6B33', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#8A9A00', marginBottom: 3 }}>TOTAL</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#E8FF6B' }}>{result.multiplier}×</div>
                    </div>
                  </div>
                </div>

                {/* Probability */}
                <div style={card()}>
                  <div style={{ ...lbl, marginBottom: 12 }}>Probability Bands</div>
                  {([
                    ['🏆 Best Case (20%)',  Math.max(1, result.months - Math.ceil(result.months * 0.2)), '#6BFF9E'],
                    ['🎯 Main (65%)',       result.months,                                               '#E8FF6B'],
                    ['⚠️ Worst (15%)',     Math.ceil(result.months * 1.4),                             '#FF6B6B'],
                  ] as [string, number, string][]).map(([label, months, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#1a1a1a', borderRadius: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color }}>{months}m</span>
                    </div>
                  ))}
                </div>

                {/* Milestone Chart */}
                <div style={card()}>
                  <div style={{ ...lbl, marginBottom: 12 }}>Growth Timeline</div>
                  {chartMiles.map((m, i) => {
                    const pct = Math.min(((m.main - inp.currentSize) / diff) * 100, 100);
                    const isLast = i === chartMiles.length - 1;
                    return (
                      <div key={m.month} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                          <span style={{ color: isLast ? '#E8FF6B' : '#555', fontWeight: isLast ? 700 : 400 }}>Month {m.month}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ color: '#FF6B6B', fontSize: 10 }}>{m.worst}cm</span>
                            <span style={{ color: isLast ? '#E8FF6B' : '#888', fontWeight: 700 }}>{m.main}cm</span>
                            <span style={{ color: '#6BFF9E', fontSize: 10 }}>{m.best}cm</span>
                          </div>
                        </div>
                        <div style={{ background: '#1a1a1a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.08, duration: 0.7 }}
                            style={{ height: '100%', background: isLast ? '#E8FF6B' : '#555', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Insight */}
                <div style={card('#E8FF6B22')}>
                  <div style={{ fontSize: 10, color: '#E8FF6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>🤖 AI Coach Insight</div>
                  {aiLoad ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ width: 16, height: 16, border: '2px solid #E8FF6B', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      <span style={{ fontSize: 12, color: '#555' }}>Gemini soch raha hai...</span>
                    </div>
                  ) : aiText ? (
                    <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, marginBottom: 10 }}>{aiText}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Personalized AI advice lo!</div>
                  )}
                  {!aiLoad && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleAI}
                      style={{ background: '#1a1a1a', color: '#E8FF6B', border: '1px solid #E8FF6B33', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {aiText ? '🔄 Refresh' : '✨ Get AI Insight'}
                    </motion.button>
                  )}
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setTab('setup')}
                  style={{ ...btn_style('#1a1a1a', '#E8FF6B'), border: '1px solid #E8FF6B33' }}>← Edit Inputs</motion.button>
              </>
            )}
          </motion.div>
        )}

        {/* ══════════════ CHECK-IN ══════════════ */}
        {tab === 'checkin' && (
          <motion.div key="checkin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div style={{ fontSize: 12, color: '#444', marginBottom: 20 }}>
              Weekly actual performance enter karo — prediction automatically update hogi!
            </div>

            {/* Gym Days */}
            <div style={card()}>
              <span style={lbl}>Gym Days This Week: <strong style={{ color: '#E8FF6B' }}>{ci.gymDays}</strong></span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
                {[1,2,3,4,5,6,7].map(d => (
                  <motion.button key={d} whileTap={{ scale: 0.85 }} onClick={() => setCi(c => ({ ...c, gymDays: d }))}
                    style={{ aspectRatio: '1', borderRadius: 10, border: 'none', background: d <= ci.gymDays ? '#E8FF6B' : '#1a1a1a', color: d <= ci.gymDays ? '#1a1a00' : '#444', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                    {d}
                  </motion.button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 8 }}>
                Multiplier: <strong style={{ color: '#E8FF6B' }}>{FREQ_M(ci.gymDays).toFixed(2)}×</strong>
              </div>
            </div>

            {/* Sleep Stars */}
            <div style={card()}>
              <span style={lbl}>Sleep Quality: <strong style={{ color: '#6B8EFF' }}>{['< 5h','6h','7h','8h','9h+'][ci.sleepStars - 1]}</strong></span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => (
                  <motion.button key={s} whileTap={{ scale: 0.8 }} onClick={() => setCi(c => ({ ...c, sleepStars: s }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 32 }}>
                    {s <= ci.sleepStars ? '⭐' : '☆'}
                  </motion.button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>
                Multiplier: <strong style={{ color: '#6B8EFF' }}>{SLEEP_M(ci.sleepStars).toFixed(2)}×</strong>
                <span style={{ marginLeft: 8, color: ci.sleepStars <= 2 ? '#FF6B6B' : ci.sleepStars >= 4 ? '#6BFF9E' : '#444' }}>
                  {ci.sleepStars <= 2 ? '⚠️ Growth severely hampered' : ci.sleepStars >= 4 ? '✅ Optimal recovery' : '↔️ Moderate recovery'}
                </span>
              </div>
            </div>

            {/* Diet Stars */}
            <div style={card()}>
              <span style={lbl}>Diet Quality This Week</span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => (
                  <motion.button key={s} whileTap={{ scale: 0.8 }} onClick={() => setCi(c => ({ ...c, dietStars: s }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 32 }}>
                    {s <= ci.dietStars ? '🍗' : '⬜'}
                  </motion.button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>
                Multiplier: <strong style={{ color: '#6BFF9E' }}>{DIET_M(ci.dietStars).toFixed(2)}×</strong>
              </div>
            </div>

            {/* Live Preview */}
            {result && (
              <div style={{ ...card('#E8FF6B22'), border: '1px solid #E8FF6B33' }}>
                <div style={{ fontSize: 10, color: '#E8FF6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Live Preview</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#555' }}>Updated</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#E8FF6B' }}>
                      {liveMonths} <span style={{ fontSize: 14, color: '#555', fontWeight: 400 }}>months</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 24 }}>
                    {liveMonths < result.months ? '📈' : liveMonths > result.months ? '📉' : '➡️'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#555' }}>Original</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#555', textDecoration: 'line-through' }}>{result.months}m</div>
                  </div>
                </div>
              </div>
            )}

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleCiSave}
              style={btn_style(ciSaved ? '#1a3a1a' : '#E8FF6B', ciSaved ? '#6BFF9E' : '#1a1a00')}>
              {ciSaved ? '✅ Saved! Prediction Updated' : '💾 Save Check-in & Update'}
            </motion.button>

            {/* Tips */}
            <div style={{ ...card(), marginTop: 14 }}>
              <div style={{ ...lbl, marginBottom: 10 }}>💡 This Week's Focus</div>
              {ci.sleepStars <= 2 && (
                <div style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 8, padding: '8px 12px', background: '#2e0a0a', borderRadius: 10 }}>
                  😴 Sleep sabse bada growth killer. 7-8h target karo — baaki sab baad mein.
                </div>
              )}
              {ci.gymDays < 3 && (
                <div style={{ fontSize: 12, color: '#FBBC04', marginBottom: 8, padding: '8px 12px', background: '#2a1a00', borderRadius: 10 }}>
                  🏋️ Frequency badha — minimum 3 days/week. Quality &gt; quantity.
                </div>
              )}
              {ci.dietStars <= 2 && (
                <div style={{ fontSize: 12, color: '#6BFF9E', marginBottom: 8, padding: '8px 12px', background: '#0a2a0a', borderRadius: 10 }}>
                  🍗 Protein fix karo. Muscle ka raw material. Iske bina sab waste.
                </div>
              )}
              {ci.sleepStars >= 4 && ci.gymDays >= 4 && ci.dietStars >= 4 && (
                <div style={{ fontSize: 12, color: '#E8FF6B', padding: '8px 12px', background: '#2a2a00', borderRadius: 10 }}>
                  🔥 Sab on-track! Consistency hi compounding hai. Keep going.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}



