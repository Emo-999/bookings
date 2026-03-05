import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Bookings from './pages/Bookings.jsx';
import Availability from './pages/Availability.jsx';
import Layout from './components/Layout.jsx';
import { BusinessProvider } from './context/BusinessContext.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                         height:'100vh', color:'#94a3b8', fontSize:'0.9rem' }}>Loading...</div>;
  }

  if (!session) {
    return <Routes><Route path="*" element={<Login />} /></Routes>;
  }

  return (
    <BusinessProvider session={session}>
    <Layout session={session}>
      <Routes>
        <Route path="/"            element={<Navigate to="/bookings" replace />} />
        <Route path="/bookings"    element={<Bookings />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="*"            element={<Navigate to="/bookings" replace />} />
      </Routes>
    </Layout>
    </BusinessProvider>
  );
}
