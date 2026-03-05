import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useBusiness } from '../context/BusinessContext.jsx';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function Availability() {
  const { activeBusiness } = useBusiness();
  const [resources, setResources]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [schedules, setSchedules]   = useState([]);
  const [blocked, setBlocked]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  // New block form
  const [blockForm, setBlockForm]   = useState({ start: '', end: '', reason: '' });
  const [blockError, setBlockError] = useState(null);

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);
    setSelected(null);
    async function load() {
      const { data: res } = await supabase
        .from('resources')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .eq('is_active', true);
      setResources(res || []);
      if (res?.length) setSelected(res[0]);
      setLoading(false);
    }
    load();
  }, [activeBusiness]);

  useEffect(() => {
    if (!selected) return;
    async function loadResource() {
      const [{ data: sched }, { data: blk }] = await Promise.all([
        supabase.from('availability_schedules').select('*').eq('resource_id', selected.id),
        supabase.from('blocked_periods').select('*').eq('resource_id', selected.id)
          .order('start_datetime', { ascending: true }),
      ]);
      setSchedules(sched || []);
      setBlocked(blk || []);
    }
    loadResource();
  }, [selected]);

  async function toggleDay(dayOfWeek, currentSchedule) {
    setSaving(true);
    if (currentSchedule) {
      await supabase.from('availability_schedules')
        .update({ is_active: !currentSchedule.is_active })
        .eq('id', currentSchedule.id);
      setSchedules(prev => prev.map(s =>
        s.id === currentSchedule.id ? { ...s, is_active: !s.is_active } : s
      ));
    } else {
      // Default hours
      const { data } = await supabase.from('availability_schedules')
        .insert({ resource_id: selected.id, day_of_week: dayOfWeek,
                  start_time: '09:00', end_time: '18:00', is_active: true })
        .select().single();
      setSchedules(prev => [...prev, data]);
    }
    setSaving(false);
  }

  async function updateHours(scheduleId, field, value) {
    await supabase.from('availability_schedules').update({ [field]: value }).eq('id', scheduleId);
    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, [field]: value } : s));
  }

  async function addBlock() {
    setBlockError(null);
    if (!blockForm.start || !blockForm.end) { setBlockError('Both dates are required.'); return; }
    if (blockForm.start >= blockForm.end) { setBlockError('End must be after start.'); return; }
    const { data, error } = await supabase.from('blocked_periods')
      .insert({
        resource_id:    selected.id,
        start_datetime: blockForm.start,
        end_datetime:   blockForm.end,
        reason:         blockForm.reason || null,
      })
      .select().single();
    if (error) { setBlockError(error.message); return; }
    setBlocked(prev => [...prev, data].sort((a,b) => a.start_datetime > b.start_datetime ? 1 : -1));
    setBlockForm({ start: '', end: '', reason: '' });
  }

  async function removeBlock(id) {
    await supabase.from('blocked_periods').delete().eq('id', id);
    setBlocked(prev => prev.filter(b => b.id !== id));
  }

  function formatDT(iso) {
    return new Date(iso).toLocaleString('en-GB', {
      day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }

  if (loading) return <div style={{ color:'#94a3b8', padding:'48px', textAlign:'center' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ margin:'0 0 24px', fontSize:'1.4rem', fontWeight:'800' }}>Availability</h1>

      {/* Resource selector */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'28px', flexWrap:'wrap' }}>
        {resources.map(r => (
          <button key={r.id} onClick={() => setSelected(r)} style={{
            padding:'8px 18px', borderRadius:'8px', border:'2px solid',
            borderColor: selected?.id === r.id ? '#2563eb' : '#e2e8f0',
            background: selected?.id === r.id ? '#eff6ff' : '#fff',
            color: selected?.id === r.id ? '#2563eb' : '#374151',
            fontWeight: selected?.id === r.id ? '600' : '400',
            cursor:'pointer', fontSize:'.9rem',
          }}>
            {r.type === 'staff' ? '👤' : '🛏️'} {r.name}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>

          {/* Weekly schedule */}
          <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'24px' }}>
            <h2 style={{ margin:'0 0 18px', fontSize:'1rem', fontWeight:'700' }}>Weekly Schedule</h2>
            {DAYS.map((day, i) => {
              const sched = schedules.find(s => s.day_of_week === i);
              const active = sched?.is_active;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px',
                                      padding:'10px 0', borderBottom: i < 6 ? '1px solid #f1f5f9' : 'none' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', minWidth:'110px' }}>
                    <input type="checkbox" checked={!!active} onChange={() => toggleDay(i, sched)} />
                    <span style={{ fontSize:'.9rem', fontWeight: active ? '600' : '400', color: active ? '#1e293b' : '#94a3b8' }}>
                      {day}
                    </span>
                  </label>
                  {active && sched && (
                    <>
                      <input type="time" value={sched.start_time}
                        onChange={e => updateHours(sched.id, 'start_time', e.target.value)}
                        style={{ border:'1px solid #e2e8f0', borderRadius:'6px', padding:'4px 8px', fontSize:'.85rem' }} />
                      <span style={{ color:'#94a3b8' }}>–</span>
                      <input type="time" value={sched.end_time}
                        onChange={e => updateHours(sched.id, 'end_time', e.target.value)}
                        style={{ border:'1px solid #e2e8f0', borderRadius:'6px', padding:'4px 8px', fontSize:'.85rem' }} />
                    </>
                  )}
                  {!active && <span style={{ color:'#cbd5e1', fontSize:'.82rem' }}>Closed</span>}
                </div>
              );
            })}
          </div>

          {/* Blocked periods */}
          <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'24px' }}>
            <h2 style={{ margin:'0 0 18px', fontSize:'1rem', fontWeight:'700' }}>Blocked Periods</h2>

            {/* Add block form */}
            <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'16px', marginBottom:'16px' }}>
              <div style={{ fontSize:'.8rem', fontWeight:'600', color:'#64748b', marginBottom:'10px',
                            textTransform:'uppercase', letterSpacing:'.04em' }}>
                Add Block
              </div>
              {blockError && (
                <div style={{ background:'#fef2f2', color:'#b91c1c', borderRadius:'6px',
                              padding:'8px 12px', fontSize:'.82rem', marginBottom:'10px' }}>
                  {blockError}
                </div>
              )}
              <div style={{ display:'grid', gap:'8px' }}>
                <div>
                  <label style={{ fontSize:'.78rem', color:'#64748b', display:'block', marginBottom:'3px' }}>From</label>
                  <input type="datetime-local" value={blockForm.start}
                    onChange={e => setBlockForm(f => ({ ...f, start: e.target.value }))}
                    style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px',
                             padding:'7px 10px', fontSize:'.85rem', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:'.78rem', color:'#64748b', display:'block', marginBottom:'3px' }}>To</label>
                  <input type="datetime-local" value={blockForm.end}
                    onChange={e => setBlockForm(f => ({ ...f, end: e.target.value }))}
                    style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px',
                             padding:'7px 10px', fontSize:'.85rem', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:'.78rem', color:'#64748b', display:'block', marginBottom:'3px' }}>Reason (optional)</label>
                  <input type="text" value={blockForm.reason} placeholder="e.g. Holiday, Maintenance"
                    onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))}
                    style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px',
                             padding:'7px 10px', fontSize:'.85rem', boxSizing:'border-box' }} />
                </div>
                <button onClick={addBlock} style={{
                  background:'#2563eb', color:'#fff', border:'none', borderRadius:'7px',
                  padding:'9px', fontWeight:'600', cursor:'pointer', fontSize:'.88rem',
                }}>
                  + Add Block
                </button>
              </div>
            </div>

            {/* Existing blocks */}
            {blocked.length === 0 ? (
              <div style={{ color:'#94a3b8', fontSize:'.85rem' }}>No blocked periods.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {blocked.map(b => (
                  <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                                           background:'#fff7ed', border:'1px solid #fed7aa',
                                           borderRadius:'8px', padding:'10px 12px' }}>
                    <div>
                      <div style={{ fontSize:'.85rem', fontWeight:'600', color:'#92400e' }}>
                        {formatDT(b.start_datetime)}
                      </div>
                      <div style={{ fontSize:'.82rem', color:'#b45309' }}>
                        → {formatDT(b.end_datetime)}
                      </div>
                      {b.reason && (
                        <div style={{ fontSize:'.78rem', color:'#78350f', marginTop:'3px' }}>{b.reason}</div>
                      )}
                    </div>
                    <button onClick={() => removeBlock(b.id)} style={{
                      background:'none', border:'none', color:'#b45309', cursor:'pointer',
                      fontSize:'1rem', padding:'0 4px', lineHeight:1,
                    }} title="Remove">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
