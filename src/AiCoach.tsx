import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const FALLBACK_TIPS = [
  "💪 Har week 2.5kg weight badhao — progressive overload hi growth ka raaz hai!",
  "😴 Sleep mein muscle banta hai. 7-8 ghante zaroor lo.",
  "🥗 Protein target: body weight (kg) × 2 grams daily.",
  "🔥 Plateau aa gaya? Exercise order change karo ya rep range vary karo.",
  "💧 Workout se pehle aur baad mein paani piyo — performance 20% better hoga.",
];

const QUICK_PROMPTS = [
  "Aaj motivated nahi hun 😔",
  "Chest workout suggest karo",
  "Diet tip do",
  "Plateau aa gaya hai",
  "Recovery kaise karein?",
];

interface Message {
  role: 'user' | 'coach';
  text: string;
  time: string;
}

export default function AiCoach() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'coach',
    text: "Kya haal hai! Main tera AI Fitness Coach hun 🤖💪\n\nMujhe bata — aaj kya feel ho raha hai? Workout, diet, motivation — kuch bhi pooch!",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const getFitContext = () => {
    try {
      const profile = localStorage.getItem('userProfile');
      const workouts = localStorage.getItem('hardreps_workout_log');
      const p = profile ? JSON.parse(profile) : {};
      const w = workouts ? JSON.parse(workouts) : [];
      return `User: ${p.name || 'Fitness enthusiast'}, Goal: ${p.fitnessGoal || 'fitness'}, Level: ${p.fitnessLevel || 'intermediate'}, Weight: ${p.weight || '?'}kg. Recent workouts: ${w.slice(0, 3).map((wk: any) => wk.exercises?.map((e: any) => e.name).join(', ')).join(' | ') || 'None yet'}`;
    } catch {
      return "User is a fitness enthusiast.";
    }
  };

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg: Message = {
      role: 'user',
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const fitContext = getFitContext();
      const history = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: `You are an expert AI Fitness Coach in HardReps app. ${fitContext}. Always detect reminder intent first. If the user asks to set a reminder, immediately reply by requesting date, time, and emotion tone only. Do not ask about weight, age, or other profile details when the user is asking for a reminder. Be motivating, direct, mix Hindi/Hinglish naturally. Keep responses under 80 words. No markdown. End with emoji.` },
            ...messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
            { role: "user", content: msgText }
          ],
          max_tokens: 250,
          temperature: 0.8
        }),
      });

      const data = await res.json();
      const replyText = data?.choices?.[0]?.message?.content
        || `Coach busy hai! Tip: ${FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)]}`;

      setMessages(prev => [...prev, {
        role: 'coach',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'coach',
        text: `Network issue! Par ye yaad rakh:\n\n${FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)]}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: '#6C63FF22', border: '2px solid #6C63FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>AI Coach</div>
            <div style={{ fontSize: 10, color: '#22c55e' }}>● Gemini 1.5 Flash · Online</div>
          </div>
        </div>
        <div style={{ background: '#6C63FF22', border: '1px solid #6C63FF44', borderRadius: 20, padding: '4px 10px', fontSize: 10, color: '#6C63FF', fontWeight: 700 }}>⚡ PRO</div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
              {msg.role === 'coach' && (
                <div style={{ width: 28, height: 28, borderRadius: 10, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
              )}
              <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? '#6C63FF' : '#1a1a1a', border: msg.role === 'coach' ? '1px solid #2a2a2a' : 'none' }}>
                <div style={{ fontSize: 13, color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                <div style={{ fontSize: 9, color: '#555', marginTop: 4, textAlign: 'right' }}>{msg.time}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px 16px 16px 4px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#6C63FF' }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px', scrollbarWidth: 'none' }}>
        {QUICK_PROMPTS.map((q, i) => (
          <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={() => sendMessage(q)}
            style={{ background: '#1a1a1a', border: '1px solid #6C63FF33', borderRadius: 20, padding: '6px 12px', fontSize: 11, color: '#6C63FF', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {q}
          </motion.button>
        ))}
      </div>

      <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #1a1a1a', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Kuch bhi pooch..."
          rows={1}
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', maxHeight: 100 }}
        />
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{ width: 42, height: 42, borderRadius: '50%', background: input.trim() && !loading ? '#6C63FF' : '#1a1a1a', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: input.trim() && !loading ? 1 : 0.4 }}>
          ➤
        </motion.button>
      </div>
    </div>
  );
}

