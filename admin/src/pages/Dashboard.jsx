import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useBusiness } from '../context/BusinessContext.jsx';

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e2e8f0',
                  padding:'22px 24px' }}>
      <div style={{ fontSize:'.8rem', fontWeight:'600', color:'#64748b', textTransform:'uppercase',
                    letterSpacing:'.04em', marginBottom:'8px' }}>{label}</div>
      <div style={{ fontSize:'2rem', fontWeight:'800', color: color || '#1e293b' }}>{value}</div>
      {sub && <div style={{ fontSize:'.82rem', color:'#94a3b8', marginTop:'4px' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { activeBusiness } = useBusiness();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);
    async function load() {
      const bid = activeBusiness.id;
      const now = new Date().toISOString();
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [
        { count: total },
        { count: pending },
        { count: confirmed },
        { count: thisMonth },
        { data: upcoming },
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count:'exact', head:true }).eq('business_id', bid),
        supabase.from('bookings').select('*', { count:'exact', head:true }).eq('business_id', bid).eq('status','pending'),
        supabase.from('bookings').select('*', { count:'exact', head:true }).eq('business_id', bid).eq('status','confirmed'),
        supabase.from('bookings').select('*', { count:'exact', head:true }).eq('business_id', bid).gte('created_at', startOfMonth),
        supabase.from('bookings')
          .select('*, resources(name), services(name, price, currency)')
          .eq('business_id', bid)
          .neq('status','cancelled')
          .gte('start_datetime', now)
          .order('start_datetime', { ascending: true })
          .limit(5),
      ]);

      setStats({ total, pending, confirmed, thisMonth, upcoming: upcoming || [] });
      setLoading(false);
    }
    load();
  }, [activeBusiness]);

  if (loading) return <div style={{ color:'#94a3b8', textAlign:'center', padding:'48px' }}>Loading...</div>;

  function fmt(iso) {
    return new Date(iso).toLocaleString('en-GB', {
      day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
    });
  }

  return (
    <div>
      <h1 style={{ margin:'0 0 24px', fontSize:'1.4rem', fontWeight:'800' }}>Dashboard</h1>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',
                    gap:'16px', marginBottom:'32px' }}>
        <StatCard label="Total Bookings"  value={stats.total}     />
        <StatCard label="Pending"         value={stats.pending}   color="#d97706" />
        <StatCard label="Confirmed"       value={stats.confirmed} color="#15803d" />
        <StatCard label="This Month"      value={stats.thisMonth} sub="new bookings" />
      </div>

      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'24px' }}>
        <h2 style={{ margin:'0 0 18px', fontSize:'1rem', fontWeight:'700' }}>Upcoming Bookings</h2>
        {stats.upcoming.length === 0 ? (
          <div style={{ color:'#94a3b8', fontSize:'.88rem' }}>No upcoming bookings.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {stats.upcoming.map(b => (
              <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                       padding:'12px 14px', background:'#f8fafc', borderRadius:'8px' }}>
                <div>
                  <div style={{ fontWeight:'600', color:'#1e293b', fontSize:'.9rem' }}>{b.customer_name}</div>
                  <div style={{ color:'#64748b', fontSize:'.82rem' }}>{b.resources?.name}
                    {b.services?.name ? ` · ${b.services.name}` : ''}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'.88rem', fontWeight:'600', color:'#374151' }}>
                    {fmt(b.start_datetime)}
                  </div>
                  <div style={{ fontSize:'.78rem', color: b.status === 'confirmed' ? '#15803d' : '#d97706',
                                 fontWeight:'600', marginTop:'2px', textTransform:'capitalize' }}>
                    {b.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
