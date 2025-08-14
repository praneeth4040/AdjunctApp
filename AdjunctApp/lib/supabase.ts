import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dkwafhgmhijsbdqpazzs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd2FmaGdtaGlqc2JkcXBhenpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTM2OTksImV4cCI6MjA2OTQ2OTY5OX0.Pk0HgZhTgg2V_OsDyTxw9grdPqP7PAEA2uUdsyQ0ag0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    detectSessionInUrl: false, // React Native apps don't use URL redirect flows
  },
});
