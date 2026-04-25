import React, { useState } from 'react';

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  weightUnit: 'kg' | 'lbs';
  heightUnit: 'cm' | 'ft';
  fitnessGoal: string;
  fitnessLevel: string;
}

const STORAGE_KEY = 'hardreps_profile';

export const getStoredProfile = (): UserProfile | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as UserProfile; }
  catch { return null; }
};

const saveProfile = (p: UserProfile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
};

interface Props {
  onComplete: (profile: UserProfile) => void;
  existingProfile?: UserProfile | null;
}

const ProfileSetup: React.FC<Props> = ({ onComplete, existingProfile }) => {
  const [form, setForm] = useState<UserProfile>(existingProfile ?? {
    name: '', age: 0, weight: 0, height: 0,
    weightUnit: 'kg', heightUnit: 'cm',
    fitnessGoal: 'muscle_gain', fitnessLevel: 'beginner',
  });

  const set = (k: keyof UserProfile, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => { saveProfile(form); onComplete(form); };

  return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', color:'#fff', padding:24, maxWidth:390, margin:'0 auto' }}>
      <div style={{ fontSize:24, fontWeight:900, marginBottom:4 }}>Setup Profile</div>
      <div style={{ fontSize:12, color:'#444', marginBottom:24 }}>Ek baar bharo — har baar kaam aayega</div>

      {/* Name */}
      <label style={{ fontSize:11, color:'#444', letterSpacing:1 }}>NAAM</label>
      <input value={form.name} onChange={e => set('name', e.target.value)}
        placeholder="Tera naam"
        style={{ display:'block', width:'100%', marginTop:6, marginBottom:16, padding:'12px 14px', background:'#111', border:'1px solid #222', borderRadius:12, color:'#fff', fontSize:14, boxSizing:'border-box' }}/>

      {/* Age */}
      <label style={{ fontSize:11, color:'#444', letterSpacing:1 }}>AGE</label>
      <input type="number" value={form.age||''} onChange={e => set('age', Number(e.target.value))}
        style={{ display:'block', width:'100%', marginTop:6, marginBottom:16, padding:'12px 14px', background:'#111', border:'1px solid #222', borderRadius:12, color:'#fff', fontSize:14, boxSizing:'border-box' }}/>

      {/* Weight */}
      <label style={{ fontSize:11, color:'#444', letterSpacing:1 }}>WEIGHT</label>
      <div style={{ display:'flex', gap:8, marginTop:6, marginBottom:16 }}>
        <input type="number" value={form.weight||''} onChange={e => set('weight', Number(e.target.value))}
          style={{ flex:1, padding:'12px 14px', background:'#111', border:'1px solid #222', borderRadius:12, color:'#fff', fontSize:14 }}/>
        {(['kg','lbs'] as const).map(u => (
          <button key={u} onClick={() => set('weightUnit', u)}
            style={{ padding:'12px 16px', borderRadius:12, border:`1px solid ${form.weightUnit===u?'#E8FF6B':'#222'}`, background:form.weightUnit===u?'#E8FF6B22':'#111', color:form.weightUnit===u?'#E8FF6B':'#444', fontWeight:700, cursor:'pointer', fontSize:13 }}>
            {u}
          </button>
        ))}
      </div>

      {/* Height */}
      <label style={{ fontSize:11, color:'#444', letterSpacing:1 }}>HEIGHT</label>
      <div style={{ display:'flex', gap:8, marginTop:6, marginBottom:16 }}>
        <input type="number" value={form.height||''} onChange={e => set('height', Number(e.target.value))}
          style={{ flex:1, padding:'12px 14px', background:'#111', border:'1px solid #222', borderRadius:12, color:'#fff', fontSize:14 }}/>
        {(['cm','ft'] as const).map(u => (
          <button key={u} onClick={() => set('heightUnit', u)}
            style={{ padding:'12px 16px', borderRadius:12, border:`1px solid ${form.heightUnit===u?'#E8FF6B':'#222'}`, background:form.heightUnit===u?'#E8FF6B22':'#111', color:form.heightUnit===u?'#E8FF6B':'#444', fontWeight:700, cursor:'pointer', fontSize:13 }}>
            {u}
          </button>
        ))}
      </div>

      {/* Goal */}
      <label style={{ fontSize:11, color:'#444', letterSpacing:1 }}>FITNESS GOAL</label>
      <div style={{ display:'flex', gap:8, marginTop:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['weight_loss','🔥 Weight Loss'],['muscle_gain','💪 Muscle Gain'],['maintain','⚖️ Maintain']].map(([val,label]) => (
          <button key={val} onClick={() => set('fitnessGoal', val)}
            style={{ padding:'10px 14px', borderRadius:12, border:`1px solid ${form.fitnessGoal===val?'#E8FF6B':'#222'}`, background:form.fitnessGoal===val?'#E8FF6B22':'#111', color:form.fitnessGoal===val?'#E8FF6B':'#444', fontWeight:700, cursor:'pointer', fontSize:12 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Level */}
      <label style={{ fontSize:11, color:'#444', letterSpacing:1 }}>FITNESS LEVEL</label>
      <div style={{ display:'flex', gap:8, marginTop:6, marginBottom:28 }}>
        {[['beginner','🌱 Beginner'],['intermediate','⚡ Inter'],['advanced','🏆 Advanced']].map(([val,label]) => (
          <button key={val} onClick={() => set('fitnessLevel', val)}
            style={{ flex:1, padding:'10px 6px', borderRadius:12, border:`1px solid ${form.fitnessLevel===val?'#E8FF6B':'#222'}`, background:form.fitnessLevel===val?'#E8FF6B22':'#111', color:form.fitnessLevel===val?'#E8FF6B':'#444', fontWeight:700, cursor:'pointer', fontSize:11 }}>
            {label}
          </button>
        ))}
      </div>

      <button onClick={handleSubmit}
        style={{ width:'100%', background:'#E8FF6B', color:'#1a1a00', border:'none', padding:18, borderRadius:16, fontWeight:900, fontSize:16, cursor:'pointer' }}>
        💪 Let's Go
      </button>
    </div>
  );
};

export default ProfileSetup;