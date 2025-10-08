import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type UserStatus = 'active' | 'semiactive' | 'offline';

interface UserMode {
  phone_number: string;
  mode: UserStatus;
}

export const useUserStatus = () => {
  const [userStatus, setUserStatus] = useState<UserStatus>('offline');
  const statusSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const initializeUserStatus = async (phone: string) => {
    try {
      const { data: existingRecord } = await supabase
        .from("usersmodes")
        .select("phone")
        .eq("phone", phone)
        .single();

      if (!existingRecord) {
        const { error } = await supabase
          .from("usersmodes")
          .insert({ phone: phone, mode: "offline" });

        if (error) {
          console.error("Error creating initial user status record:", error.message);
        } else {
          console.log(`Created initial status record for ${phone} with default mode: offline`);
          setUserStatus("offline");
        }
      } else {
        await fetchUserStatus(phone);
      }
    } catch (error) {
      console.error("Error in initializeUserStatus:", error);
      setUserStatus("offline");
    }
  };

  const fetchUserStatus = async (phone: string) => {
    try {
      const { data, error } = await supabase
        .from("usersmodes")
        .select("mode")
        .eq("phone", phone)
        .single();

      if (error) {
        console.error("Error fetching user status:", error.message);
        setUserStatus("offline");
      } else {
        const userData = data as UserMode;
        const mode = userData?.mode || "offline";
        setUserStatus(mode);
      }
    } catch (error) {
      console.error("Error in fetchUserStatus:", error);
      setUserStatus("offline");
    }
  };

  const subscribeToStatusChanges = useCallback((phone: string) => {
    if (statusSubscriptionRef.current) {
      supabase.removeChannel(statusSubscriptionRef.current);
    }

    const channel = supabase.channel("usersmodes-realtime");

    channel.on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "usersmodes",
        filter: `phone_number=eq.${phone}`
      },
      (payload) => {
        if (payload.new && (payload.new as UserMode).mode) {
          setUserStatus((payload.new as UserMode).mode);
        }
      }
    );

    channel.subscribe();
    statusSubscriptionRef.current = channel;
  }, []);

  const getNextStatus = (currentStatus: UserStatus): UserStatus => {
    switch (currentStatus) {
      case "active": return "semiactive";
      case "semiactive": return "offline";
      case "offline": return "active";
      default: return "active";
    }
  };

  const toggleUserStatus = async (phoneNumber: string) => {
    if (!phoneNumber) {
      console.log("No phone number available");
      return;
    }

    const newStatus = getNextStatus(userStatus);
    setUserStatus(newStatus);

    try {
      const { error } = await supabase
        .from("usersmodes")
        .update({ mode: newStatus })
        .eq("phone", phoneNumber);

      if (error) {
        console.error("Failed to update status:", error.message);
        setUserStatus(userStatus);
      } else {
        console.log(`Status updated to: ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setUserStatus(userStatus);
    }
  };

  const cleanup = () => {
    if (statusSubscriptionRef.current) {
      supabase.removeChannel(statusSubscriptionRef.current);
    }
  };

  return {
    userStatus,
    initializeUserStatus,
    subscribeToStatusChanges,
    toggleUserStatus,
    cleanup,
  };
};
