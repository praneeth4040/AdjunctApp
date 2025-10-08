import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

const LOCK_KEY = "chatlock_password";

export const useChatLock = () => {
  const [lockedChats, setLockedChats] = useState<string[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const getLockedChats = async (userPhone: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from("chatlock")
      .select("chat_phone")
      .eq("user_phone", userPhone);

    if (error) {
      console.error("Failed to fetch locked chats:", error.message);
      return [];
    }

    return data.map((row) => row.chat_phone);
  };

  const fetchLockedChats = async (phone: string) => {
    const locked = await getLockedChats(phone);
    setLockedChats(locked);
  };

  const saveLockPassword = async (phoneNumber: string, password: string) => {
    await SecureStore.setItemAsync(LOCK_KEY, password);
    
    const { error } = await supabase
      .from("profiles")
      .update({ lock_password: password })
      .eq("phone_number", phoneNumber);

    if (error) {
      console.error("Failed to save lock password to Supabase:", error.message);
    }
  };

  const getLocalLockPassword = async () => {
    return await SecureStore.getItemAsync(LOCK_KEY);
  };

  const getSupabaseLockPassword = async (phoneNumber: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("lock_password")
      .eq("phone_number", phoneNumber)
      .single();

    if (error) {
      console.error("Error fetching lock password from Supabase:", error.message);
      return null;
    }

    return data?.lock_password || null;
  };

  const checkPasswordExists = async (phoneNumber: string) => {
    const localPassword = await getLocalLockPassword();
    const supabasePassword = await getSupabaseLockPassword(phoneNumber);
    return localPassword || supabasePassword;
  };

  const lockChat = async (userPhone: string, chatPhone: string) => {
    const { error } = await supabase
      .from("chatlock")
      .upsert([{ user_phone: userPhone, chat_phone: chatPhone }]);

    if (error) {
      console.error("Failed to lock chat:", error.message);
      return false;
    }

    return true;
  };

  const unlockChat = async (userPhone: string, chatPhone: string) => {
    const { error } = await supabase
      .from("chatlock")
      .delete()
      .eq("user_phone", userPhone)
      .eq("chat_phone", chatPhone);

    if (error) {
      console.error("Failed to unlock chat:", error.message);
      return false;
    }

    return true;
  };

  const handleUnlockRequest = async (phoneNumber: string) => {
    const passwordExists = await checkPasswordExists(phoneNumber);
    
    if (!passwordExists) {
      Alert.alert("No Password Set", "You haven't set a lock password yet");
      return false;
    }
    
    return true;
  };

  const handleUnlockVerification = async (unlockPasswordInput: string, phoneNumber: string) => {
    const storedPassword = await getLocalLockPassword() || await getSupabaseLockPassword(phoneNumber);
    
    if (unlockPasswordInput === storedPassword) {
      setIsUnlocked(true);
      
      // Auto-hide after 30 seconds for security
      setTimeout(() => {
        setIsUnlocked(false);
      }, 30000);
      
      Alert.alert("Unlocked", "Locked chats are now visible for 30 seconds");
      return true;
    } else {
      Alert.alert("Wrong Password", "Please enter the correct password");
      return false;
    }
  };

  const handleLockSelectedChats = async (
    selectedChats: string[],
    phoneNumber: string,
    passwordInput: string,
    confirmPasswordInput: string,
    isSettingPassword: boolean
  ) => {
    if (selectedChats.length === 0) {
      Alert.alert("No Selection", "Please select chats to lock");
      return false;
    }

    try {
      if (isSettingPassword) {
        // Setting new password
        if (passwordInput.length < 4) {
          Alert.alert("Password Too Short", "Password must be at least 4 characters");
          return false;
        }
        
        if (passwordInput !== confirmPasswordInput) {
          Alert.alert("Password Mismatch", "Passwords don't match");
          return false;
        }

        await saveLockPassword(phoneNumber, passwordInput);
      } else {
        // Verifying existing password
        const storedPassword = await getLocalLockPassword() || await getSupabaseLockPassword(phoneNumber);
        
        if (passwordInput !== storedPassword) {
          Alert.alert("Wrong Password", "Please enter the correct password");
          return false;
        }
      }

      // Lock the chats
      for (const chatPhone of selectedChats) {
        await lockChat(phoneNumber, chatPhone);
      }
      
      // Update UI
      setLockedChats(prev => [...prev, ...selectedChats]);
      
      Alert.alert("Chats Locked", `${selectedChats.length} chat(s) have been locked`);
      return true;
    } catch (error) {
      console.error("Error locking chats:", error);
      Alert.alert("Error", "Failed to lock chats");
      return false;
    }
  };

  const handleUnlockSelectedChats = async (selectedUnlockChats: string[], phoneNumber: string) => {
    if (selectedUnlockChats.length === 0) {
      Alert.alert("No Selection", "Please select chats to unlock");
      return false;
    }

    try {
      for (const chatPhone of selectedUnlockChats) {
        await unlockChat(phoneNumber, chatPhone);
      }
      
      // Update UI
      setLockedChats(prev => prev.filter(phone => !selectedUnlockChats.includes(phone)));
      
      Alert.alert("Chats Unlocked", `${selectedUnlockChats.length} chat(s) have been unlocked`);
      return true;
    } catch (error) {
      console.error("Error unlocking chats:", error);
      Alert.alert("Error", "Failed to unlock chats");
      return false;
    }
  };

  return {
    lockedChats,
    isUnlocked,
    fetchLockedChats,
    checkPasswordExists,
    handleUnlockRequest,
    handleUnlockVerification,
    handleLockSelectedChats,
    handleUnlockSelectedChats,
    getLocalLockPassword,
    getSupabaseLockPassword,
  };
};
