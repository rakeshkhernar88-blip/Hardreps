import { useState, useEffect } from 'react';
import { motion } from 'motion/react';


interface WeightEntry {
  date: string;   // "YYYY-MM-DD"
  weight: number; // kg
}

interface Props {
  fitData: FitDataType;
  nextSyncIn: number;
}

const WEIGHT_KEY = 'hardreps_weight_log';
const DAYS_LABELS = ['M','T','W','T','F','S','S'];

function loadWeights(): WeightEntry[] {
  try { return JSON.parse(localStorage.getItem(WEIGHT_KEY) || '[]'); }
  catch { return []; }
}

function saveWeights(entries: WeightEntry[]) {
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(entries));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const StatsView = ({ fitData, nextSyncIn }: Props) => {
  const maxSteps = Math.max(...fitData.steps.weeklyData, 1);

  // ── Weight state ──────────────────────────────────────────
  const [weightLog, setWeightLog]   = useState<WeightEntry[]>(loadWeights);
  const [inputKg,   setInputKg]     = useState('');
  const [saved,     setSaved]       = useState(false);

  useEffect(() => { saveWeights(weightLog); }, [weightLog]);

  const handleSave = () => {
    const kg = parseFloat(inputKg);
    if (!kg || kg < 20 || kg > 300) return;
    const today = todayStr();
    setWeightLog(prev => {
      const filtered = prev.filter(e => e.date !== today);
      return [...filtered, { date: today, weight: kg }].slice(-30); // last 30 days
    });
    setInputKg('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Last 14 entries for graph
  const graphData = weightLog.slice(-14);
  const weights   = graphData.map(e => e.weight);
  const minW      = weights.length ? Math.min(...weights) - 2 : 50;
  const maxW      = weights.length ? Math.max(...weights) + 2 : 100;
  const range     = maxW - minW || 1;

  const latestWeight  = weights[weights.length - 1] ?? null;
  const firstWeight   = weights[0] ?? null;
  const weightChange  = latestWeight && firstWeight ? +(latestWeight - firstWeight).toFixed(1) : null;

  // SVG polyline points (260×80 canvas)
  const GRAPH_W = 260;
  const GRAPH_H = 80;
  const points  = graphData.map((e, i) => {
    const x = graphData.length < 2 ? GRAPH_W / 2 : (i / (graphData.length - 1)) * GRAPH_W;
    const y = GRAPH_H - ((e.weight - minW) / range) * GRAPH_H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '48px 24px 120px' }}>

      {/* ── Header ── */}
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Weekly Stats</div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Real Data · Google Fit</div>
      <div style={{ fontSize: 11, color: '#444', marginBottom: 16 }}>Live · next sync in {nextSyncIn}s</div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          ['Total Steps', fitData.steps.weeklyData.reduce((a,b)=>a+b,0).toLocaleString(), '#E8FF6B', '🦶'],
          ['Avg Sleep',   `${fitData.sleep.hours}h`, '#6B8EFF', '😴'],
          ['Avg HR',      String(fitData.heartRate.avg || '—'), '#FF6B6B', '❤️'],
          ['Max HR',      String(fitData.heartRate.max || '—'), '#FBBC04', '🔥'],
        ].map(([label, val, color, ic], i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ background: '#111', borderRadius: 20, padding: 16, border: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{ic}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: color as string }}>{val}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Weight Progress Graph ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ background: '#111', borderRadius: 20, padding: 16, border: '1px solid #1a1a1a', marginBottom: 14 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>
            ⚖️ Weight Progress
          </div>
          {weightChange !== null && (
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: weightChange <= 0 ? '#6BFF9E' : '#FF6B6B',
              background: weightChange <= 0 ? '#0a2e1a' : '#2e0a0a',
              borderRadius: 8, padding: '2px 8px'
            }}>
              {weightChange > 0 ? '+' : ''}{weightChange} kg
            </div>
          )}
        </div>

        {/* Graph */}
        {graphData.length >= 2 ? (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            {/* Y-axis labels */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 16,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: 9, color: '#444' }}>{maxW.toFixed(0)}</div>
              <div style={{ fontSize: 9, color: '#444' }}>{((maxW+minW)/2).toFixed(0)}</div>
              <div style={{ fontSize: 9, color: '#444' }}>{minW.toFixed(0)}</div>
            </div>
            <div style={{ marginLeft: 24 }}>
              <svg width="100%" viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0, 0.5, 1].map(t => (
                  <line key={t} x1="0" y1={GRAPH_H * (1 - t)} x2={GRAPH_W} y2={GRAPH_H * (1 - t)}
                    stroke="#1a1a1a" strokeWidth="1" />
                ))}
                {/* Area fill */}
                <polyline
                  points={`0,${GRAPH_H} ` + points + ` ${GRAPH_W},${GRAPH_H}`}
                  fill="url(#wGrad)" stroke="none" />
                {/* Line */}
                <polyline points={points} fill="none" stroke="#A78BFA"
                  strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {/* Dots */}
                {graphData.map((e, i) => {
                  const x = (i / (graphData.length - 1)) * GRAPH_W;
                  const y = GRAPH_H - ((e.weight - minW) / range) * GRAPH_H;
                  return (
                    <circle key={i} cx={x} cy={y} r="4"
                      fill={i === graphData.length - 1 ? '#A78BFA' : '#111'}
                      stroke="#A78BFA" strokeWidth="2" />
                  );
                })}
              </svg>
              {/* X labels: first and last date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ fontSize: 9, color: '#444' }}>{graphData[0]?.date.slice(5)}</div>
                <div style={{ fontSize: 9, color: '#A78BFA' }}>{graphData[graphData.length-1]?.date.slice(5)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#333', fontSize: 12 }}>
            {graphData.length === 0
              ? 'Abhi koi data nahi hai. Pehla weight add karo! 👇'
              : 'Graph ke liye 2+ entries chahiye'}
          </div>
        )}

        {/* Latest weight display */}
        {latestWeight && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#A78BFA' }}>
              {latestWeight}
              <span style={{ fontSize: 14, color: '#555', fontWeight: 400 }}> kg</span>
            </div>
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            value={inputKg}
            onChange={e => setInputKg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Aaj ka weight (kg)"
            step="0.1"
            min="20"
            max="300"
            style={{
              flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: 12, padding: '10px 14px', color: '#fff',
              fontSize: 14, outline: 'none',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleSave}
            style={{
              background: saved ? '#1a3a1a' : '#A78BFA',
              color: saved ? '#6BFF9E' : '#000',
              border: 'none', borderRadius: 12,
              padding: '10px 18px', fontWeight: 900,
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {saved ? '✓ Saved!' : 'Log'}
          </motion.button>
        </div>

        {/* History: last 5 entries */}
        {weightLog.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {weightLog.slice(-5).reverse().map((e, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '5px 0',
                borderBottom: i < Math.min(weightLog.length, 5) - 1 ? '1px solid #1a1a1a' : 'none'
              }}>
                <div style={{ fontSize: 11, color: '#555' }}>{e.date}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA' }}>{e.weight} kg</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Daily Steps Breakdown ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        style={{ background: '#111', borderRadius: 20, padding: 16, border: '1px solid #1a1a1a' }}>
        <div style={{ fontSize: 12, color: '#555', letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase' }}>
          Daily Breakdown
        </div>
        {fitData.steps.weeklyData.map((steps, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 12, paddingBottom: 12,
            borderBottom: i < 6 ? '1px solid #1a1a1a' : 'none',
          }}>
            <div style={{ width: 32, fontSize: 11, color: i === 6 ? '#E8FF6B' : '#555', fontWeight: i === 6 ? 700 : 400 }}>
              {DAYS_LABELS[i]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 4, height: 6, marginBottom: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${(steps/maxSteps)*100}%` }}
                  transition={{ delay: i * 0.05, duration: 0.6 }}
                  style={{ background: '#E8FF6B', height: 6, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 10, color: '#444' }}>
                {steps > 0 ? steps.toLocaleString() + ' steps' : 'No data'}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>
              {Math.round((steps / fitData.steps.goal) * 100)}%
            </div>
          </div>
        ))}
      </motion.div>

    </motion.div>
  );
};
