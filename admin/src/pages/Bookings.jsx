import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useBusiness } from '../context/BusinessContext.jsx';

const STATUS_COLORS = {
  pending:   { bg:'#fef9c3', color:'#854d0e', label:'Pending' },
  confirmed: { bg:'#dcfce7', color:'#15803d', label:'Confirmed' },
  cancelled: { bg:'#fee2e2', color:'#b91c1c', label:'Cancelled' },
};

function Badge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background:c.bg, color:c.color, borderRadius:'20px',
                   padding:'3px 10px', fontSize:'.78rem', fontWeight:'600' }}>
      {c.label}
    </span>
  );
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

export default function Bookings() {
  const { activeBusiness } = useBusiness();
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [updating, setUpdating]   = useState(null);

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('*, resources(name, type), services(name, price, currency, duration_minutes)')
        .eq('business_id', activeBusiness.id)
        .order('created_at', { ascending: false });
      setBookings(data || []);
      setLoading(false);
    }
    load();
  }, [activeBusiness]);

  async function updateStatus(id, status) {
    setUpdating(id);
    await supabase.from('bookings').update({ status }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    setUpdating(null);
  }

  const filtered = bookings.filter(b => {
    const matchStatus = filter === 'all' || b.status === filter;
    const matchSearch = !search ||
      b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const isHotel = activeBusiness?.type === 'hotel';

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'1.4rem', fontWeight:'800' }}>Bookings</h1>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <input
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'8px 12px',
                     fontSize:'.88rem', outline:'none', width:'220px' }}
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'8px 12px',
                     fontSize:'.88rem', outline:'none', cursor:'pointer' }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ color:'#94a3b8', textAlign:'center', padding:'48px' }}>Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color:'#94a3b8', textAlign:'center', padding:'48px' }}>No bookings found.</div>
      ) : (
        <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.88rem' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                {['Customer', isHotel ? 'Room' : 'Staff / Service',
                  isHotel ? 'Check-in / Check-out' : 'Date & Time',
                  isHotel ? 'Guests' : 'Duration',
                  'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontWeight:'600',
                                       color:'#64748b', fontSize:'.78rem', textTransform:'uppercase',
                                       letterSpacing:'.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ fontWeight:'600', color:'#1e293b' }}>{b.customer_name}</div>
                    <div style={{ color:'#64748b', fontSize:'.82rem' }}>{b.customer_email}</div>
                    {b.customer_phone && <div style={{ color:'#94a3b8', fontSize:'.78rem' }}>{b.customer_phone}</div>}
                  </td>
                  <td style={{ padding:'14px 16px', color:'#374151' }}>
                    <div>{b.resources?.name}</div>
                    {b.services?.name && <div style={{ color:'#64748b', fontSize:'.82rem' }}>{b.services.name}</div>}
                  </td>
                  <td style={{ padding:'14px 16px', color:'#374151' }}>
                    {isHotel ? (
                      <>
                        <div>{formatDateTime(b.start_datetime).split(',')[0]}</div>
                        <div style={{ color:'#64748b', fontSize:'.82rem' }}>
                          → {formatDateTime(b.end_datetime).split(',')[0]}
                        </div>
                      </>
                    ) : (
                      <div>{formatDateTime(b.start_datetime)}</div>
                    )}
                  </td>
                  <td style={{ padding:'14px 16px', color:'#374151' }}>
                    {isHotel
                      ? `${b.guests || 1} guest${b.guests !== 1 ? 's' : ''}`
                      : b.services?.duration_minutes
                        ? `${b.services.duration_minutes} min`
                        : '—'
                    }
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <Badge status={b.status} />
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      {b.status === 'pending' && (
                        <button
                          disabled={updating === b.id}
                          onClick={() => updateStatus(b.id, 'confirmed')}
                          style={{ padding:'5px 12px', background:'#dcfce7', color:'#15803d',
                                   border:'none', borderRadius:'6px', cursor:'pointer',
                                   fontSize:'.8rem', fontWeight:'600' }}
                        >
                          Confirm
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button
                          disabled={updating === b.id}
                          onClick={() => updateStatus(b.id, 'cancelled')}
                          style={{ padding:'5px 12px', background:'#fee2e2', color:'#b91c1c',
                                   border:'none', borderRadius:'6px', cursor:'pointer',
                                   fontSize:'.8rem', fontWeight:'600' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
