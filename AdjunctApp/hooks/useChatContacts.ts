import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Contact {
  phone: string;
  name: string;
}

export const useChatContacts = (senderPhone: string) => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const loadContacts = useCallback(async () => {
    try {
      console.log("Loading contacts for sender:", senderPhone);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("phone_number, name")
        .neq("phone_number", senderPhone);
      
      console.log("Supabase response:", { data, error });
      
      if (error) throw error;
      
      const contactList = (data || []).map(profile => ({
        phone: profile.phone_number,
        name: profile.name || profile.phone_number
      }));
      
      console.log("Final contacts:", contactList);
      setContacts(contactList);
    } catch (err) {
      console.error("Load contacts error:", err);
    }
  }, [senderPhone]);

  return {
    contacts,
    loadContacts,
  };
};
