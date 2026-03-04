import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://exzobwyejtvtqsfrsrvz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4em9id3llanR2dHFzZnJzcnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjc5NTgsImV4cCI6MjA4ODIwMzk1OH0.oIzPnsFMHmhwoU-antKbDNtJe2dXpuHDxbeMVjcdOpw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
