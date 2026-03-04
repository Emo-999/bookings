import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

const NAV = [
  { to: '/bookings',     label: 'Bookings',     icon: '📋' },
  { to: '/availability', label: 'Availability',  icon: '🗓️' },
  { to: '/dashboard',    label: 'Dashboard',     icon: '📊' },
];

export default function Layout({ children, session }) {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('business_members')
        .select('business_id, businesses(name, type)')
        .eq('user_id', session.user.id)
        .single();
      if (data) setBusiness(data.businesses);
    }
    load();
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', background:'#1e293b', color:'#cbd5e1',
        display:'flex', flexDirection:'column', flexShrink: 0,
      }}>
        <div style={{ padding:'24px 20px 16px' }}>
          <div style={{ fontSize:'1.1rem', fontWeight:'800', color:'#fff' }}>BookingOS</div>
          {business && (
            <div style={{ marginTop:'6px' }}>
              <div style={{ fontSize:'.82rem', color:'#94a3b8' }}>
                {business.type === 'hotel' ? '🏨' : '✂️'} {business.name}
              </div>
            </div>
          )}
        </div>
        <nav style={{ flex:1, padding:'8px 12px' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'10px',
              padding:'10px 12px', borderRadius:'8px', textDecoration:'none',
              color: isActive ? '#fff' : '#94a3b8',
              background: isActive ? '#2563eb' : 'transparent',
              marginBottom:'4px', fontSize:'.9rem', fontWeight: isActive ? '600' : '400',
            })}>
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'16px 20px', borderTop:'1px solid #334155' }}>
          <div style={{ fontSize:'.78rem', color:'#64748b', marginBottom:'8px',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {session.user.email}
          </div>
          <button onClick={handleLogout} style={{
            background:'transparent', border:'1px solid #334155', color:'#94a3b8',
            borderRadius:'6px', padding:'7px 14px', cursor:'pointer', fontSize:'.82rem', width:'100%',
          }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, padding:'32px', overflow:'auto' }}>
        {children}
      </main>
    </div>
  );
}
