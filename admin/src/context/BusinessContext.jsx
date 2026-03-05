import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const BusinessContext = createContext(null);

export function BusinessProvider({ session, children }) {
  const [businesses, setBusinesses] = useState([]);
  const [activeBusiness, setActiveBusiness] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('business_members')
        .select('business_id, businesses(*)')
        .eq('user_id', session.user.id);
      if (!data?.length) return;
      const list = data.map(d => d.businesses);
      setBusinesses(list);
      setActiveBusiness(list[0]);
    }
    load();
  }, [session]);

  return (
    <BusinessContext.Provider value={{ businesses, activeBusiness, setActiveBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
