import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const s = {
  wrap:  { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'16px' },
  card:  { background:'#fff', borderRadius:'14px', padding:'40px 36px', width:'100%', maxWidth:'380px',
           boxShadow:'0 4px 24px rgba(0,0,0,.08)' },
  logo:  { fontSize:'1.6rem', fontWeight:'800', color:'#2563eb', marginBottom:'8px' },
  sub:   { color:'#64748b', fontSize:'.9rem', marginBottom:'28px' },
  label: { display:'block', fontSize:'.8rem', fontWeight:'600', color:'#374151',
           marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.04em' },
  input: { width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:'8px',
           padding:'10px 12px', fontSize:'.95rem', outline:'none', marginBottom:'14px' },
  btn:   { width:'100%', padding:'12px', background:'#2563eb', color:'#fff', border:'none',
           borderRadius:'8px', fontWeight:'600', fontSize:'1rem', cursor:'pointer' },
  err:   { background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c',
           borderRadius:'8px', padding:'10px 14px', fontSize:'.88rem', marginBottom:'14px' },
  ok:    { background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d',
           borderRadius:'8px', padding:'10px 14px', fontSize:'.88rem', marginBottom:'14px' },
};

export default function Login() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [error, setError]     = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null); setMsg(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) setError(err.message);
    else     setMsg('Check your email for the login link.');
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>BookingOS</div>
        <div style={s.sub}>Sign in to manage your bookings</div>
        {error && <div style={s.err}>{error}</div>}
        {msg   && <div style={s.ok}>{msg}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" required placeholder="you@yourbusiness.com"
                 value={email} onChange={e => setEmail(e.target.value)} />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
