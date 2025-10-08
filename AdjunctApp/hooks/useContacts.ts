import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';

export const useContacts = () => {
  const [contactsMap, setContactsMap] = useState<Record<string, string>>({});
  const [contactsLoaded, setContactsLoaded] = useState(false);

  const normalizePhone = (phone?: string) => phone?.replace(/\D/g, "") || "";

  const loadContacts = useCallback(async () => {
    if (contactsLoaded) return contactsMap; // Don't reload if already loaded
    
    try {
      // Try loading from AsyncStorage first
      const storedContacts = await AsyncStorage.getItem('contactsMap');
      if (storedContacts) {
        const parsedContacts = JSON.parse(storedContacts);
        setContactsMap(parsedContacts);
        setContactsLoaded(true);
        return parsedContacts;
      }
  
      // Only fetch from device if not in storage
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setContactsLoaded(true);
        return {};
      }
  
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
  
      const phoneMap: Record<string, string> = {};
      data.forEach((contact) => {
        contact.phoneNumbers?.forEach((num) => {
          const clean = normalizePhone(num.number);
          if (clean) phoneMap[clean] = contact.name || "";
        });
      });
  
      // Save to AsyncStorage
      await AsyncStorage.setItem('contactsMap', JSON.stringify(phoneMap));
      setContactsMap(phoneMap);
      setContactsLoaded(true);
      return phoneMap;
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContactsLoaded(true);
      return {};
    }
  }, [contactsLoaded, contactsMap]);

  return {
    contactsMap,
    contactsLoaded,
    loadContacts,
    normalizePhone,
  };
};