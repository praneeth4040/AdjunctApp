import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { fetchLocal, insertLocal } from '../library/database';

export const useUserProfile = () => {
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const normalizePhone = (phone?: string) => phone?.replace(/\D/g, "") || "";

  // Get phone number from AsyncStorage
  const getPhoneFromStorage = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('senderPhone');
      return storedPhone ? normalizePhone(storedPhone) : null;
    } catch (error) {
      console.error('Error getting phone from AsyncStorage:', error);
      return null;
    }
  };

  const getUserProfile = async (senderPhone: string) => {
    try {
      // Get from local SQLite first
      const profiles = await fetchLocal('profiles');
      const userProfile = profiles.find(p => p.phone_number === senderPhone);
      
      if (userProfile) {
        setUserName(userProfile.name);
      } else {
        // Fallback to Supabase if not found locally
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, name")
          .eq("phone_number", senderPhone)
          .single();

        if (error) {
          console.error("Error fetching profile:", error.message);
        } else if (data) {
          setUserName(data.name);
          await insertLocal('profiles', {
            user_id: data.user_id || uuidv4(),
            phone_number: senderPhone,
            name: data.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const initializeUser = async () => {
    const storedPhone = await getPhoneFromStorage();
    
    if (storedPhone) {
      setPhoneNumber(storedPhone);
      await getUserProfile(storedPhone);
      return storedPhone;
    } else {
      // Handle case when phone not in storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
  
      const { data } = await supabase
        .from("profiles")
        .select("name, phone_number")
        .eq("user_id", user.id)
        .single();
  
      const phone = normalizePhone(data?.phone_number);
      setUserName(data?.name || "User");
      
      if (phone) {
        setPhoneNumber(phone);
        await AsyncStorage.setItem('senderPhone', phone);
        await getUserProfile(phone);
        return phone;
      }
    }
    
    return null;
  };

  return {
    userName,
    phoneNumber,
    initializeUser,
    normalizePhone,
  };
};
