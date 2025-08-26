import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";
import * as Contacts from "expo-contacts";
import LinearGradient from "react-native-linear-gradient";

interface Conversation {
  id: string | number;
  phoneNumber: string;
  name: string;
  profileImage: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  status?: "active" | "semiactive" | "offline";
}

interface SupabaseMessage {
  id: string | number;
  sender_phone: string;
  receiver_phone: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface UserMode {
  phone_number: string;
  mode: "active" | "semiactive" | "offline";
}

export default function ChatsScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userName, setUserName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactsMap, setContactsMap] = useState<Record<string, string>>({});
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const statusSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<"active" | "semiactive" | "offline">("offline");

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

  const loadContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return;

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

    setContactsMap(phoneMap);
  };

  // Create user status record on first login with default mode
  const initializeUserStatus = async (phone: string) => {
    try {
      // First check if record already exists
      const { data: existingRecord } = await supabase
        .from("usersmodes")
        .select("phone")
        .eq("phone", phone)
        .single();

      // If no record exists, create one with default "offline" mode
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
        // Record exists, fetch current status
        await fetchUserStatus(phone);
      }
    } catch (error) {
      console.error("Error in initializeUserStatus:", error);
      setUserStatus("offline");
    }
  };

  // Fetch current user status from database
  const fetchUserStatus = async (phone: string) => {
    try {
      const { data, error } = await supabase
        .from("usersmodes")
        .select("mode")
        .eq("phone", phone)
        .single();

      if (error) {
        console.error("Error fetching user status:", error.message);
        setUserStatus("offline"); // Default fallback
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

  // Subscribe to real-time status changes
  const subscribeToStatusChanges = (phone: string) => {
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
  };

  const fetchUserAndContacts = useCallback(async () => {
    await loadContacts();

    // Try to get phone from AsyncStorage first
    const storedPhone = await getPhoneFromStorage();
    
    if (storedPhone) {
      setPhoneNumber(storedPhone);
      await initializeUserStatus(storedPhone);
      subscribeToStatusChanges(storedPhone);
      await fetchConversations(storedPhone);
      subscribeToMessages(storedPhone);
    } else {
      // Fallback to Supabase auth if no phone in AsyncStorage
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("name, phone_number")
        .eq("user_id", user.id)
        .single();

      const phone = normalizePhone(data?.phone_number);
      setUserName(data?.name || "User");
      
      if (phone) {
        setPhoneNumber(phone);
        // Store in AsyncStorage for future use
        await AsyncStorage.setItem('senderPhone', phone);
        await initializeUserStatus(phone);
        subscribeToStatusChanges(phone);
        await fetchConversations(phone);
        subscribeToMessages(phone);
      }
    }
  }, []);

  const fetchConversations = async (currentUserPhone: string) => {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_phone.eq.${currentUserPhone},receiver_phone.eq.${currentUserPhone}`)
      .order("created_at", { ascending: false });

    const latestMap = new Map<string, SupabaseMessage>();
    const unreadMap: Record<string, number> = {};

    messages?.forEach((msg) => {
      const partner =
        msg.sender_phone === currentUserPhone ? msg.receiver_phone : msg.sender_phone;
      const clean = normalizePhone(partner);

      if (!latestMap.has(clean)) latestMap.set(clean, msg);

      if (msg.receiver_phone === currentUserPhone && !msg.is_read) {
        unreadMap[clean] = (unreadMap[clean] || 0) + 1;
      }
    });

    const partnerPhones = Array.from(latestMap.keys());
    const { data: partners } = await supabase
      .from("profiles")
      .select("phone_number, profile_picture")
      .in("phone_number", partnerPhones);

    const result: Conversation[] = partnerPhones.map((phone) => {
      const msg = latestMap.get(phone)!;
      const partner = partners?.find(
        (p) => normalizePhone(p.phone_number) === phone
      );

      const randomStatus = ["active" , "semiactive" , "offline"][
        Math.floor(Math.random() * 3)
      ] as "active" | "semiactive" | "offline";

      return {
        id: msg.id,
        phoneNumber: phone,
        name: contactsMap[phone] || phone,
        profileImage: partner?.profile_picture || "",
        lastMessage: msg.message,
        time: new Date(msg.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        unreadCount: unreadMap[phone] || 0,
        status: randomStatus,
      };
    });

    setConversations(result);
  };

  const markMessagesAsRead = async (partnerPhone: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        normalizePhone(c.phoneNumber) === normalizePhone(partnerPhone)
          ? { ...c, unreadCount: 0 }
          : c
      )
    );

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_phone", partnerPhone)
      .eq("receiver_phone", phoneNumber)
      .eq("is_read", false);
  };

  const subscribeToMessages = (currentUserPhone: string) => {
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);

    const channel = supabase.channel("messages-realtime");

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const newMsg = payload.new as SupabaseMessage;
        if (
          newMsg.sender_phone !== currentUserPhone &&
          newMsg.receiver_phone !== currentUserPhone
        )
          return;

        const partner =
          newMsg.sender_phone === currentUserPhone
            ? newMsg.receiver_phone
            : newMsg.sender_phone;
        const clean = normalizePhone(partner);

        const existing = conversations.find(
          (c) => normalizePhone(c.phoneNumber) === clean
        );

        let profileImage = existing?.profileImage || "";
        if (!existing) {
          const { data: partnerData } = await supabase
            .from("profiles")
            .select("profile_picture")
            .eq("phone_number", partner)
            .single();
          profileImage = partnerData?.profile_picture || "";
        }

        const unreadCount =
          newMsg.receiver_phone === currentUserPhone && !newMsg.is_read
            ? (existing?.unreadCount || 0) + 1
            : existing?.unreadCount || 0;

        const updatedConv: Conversation = {
          id: newMsg.id,
          phoneNumber: partner,
          name: contactsMap[clean] || partner,
          profileImage,
          lastMessage: newMsg.message,
          time: new Date(newMsg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unreadCount,
          status: existing?.status || "offline",
        };

        setConversations((prev) => [
          updatedConv,
          ...prev.filter((c) => normalizePhone(c.phoneNumber) !== clean),
        ]);
      }
    );

    channel.subscribe();
    subscriptionRef.current = channel;
  };

  useFocusEffect(
    useCallback(() => {
      if (phoneNumber) fetchConversations(phoneNumber);
    }, [phoneNumber])
  );

  useEffect(() => {
    fetchUserAndContacts();
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (statusSubscriptionRef.current) supabase.removeChannel(statusSubscriptionRef.current);
    };
  }, [fetchUserAndContacts]);

  // Cycle through status modes
  const getNextStatus = (currentStatus: "active" | "semiactive" | "offline") => {
    switch (currentStatus) {
      case "active":
        return "semiactive";
      case "semiactive":
        return "offline";
      case "offline":
        return "active";
      default:
        return "active";
    }
  };

  // Toggle user status with database update
  const toggleUserStatus = async () => {
    if (!phoneNumber) {
      console.log("No phone number available");
      return;
    }

    const newStatus = getNextStatus(userStatus);
    
    // Optimistic update for immediate UI feedback
    setUserStatus(newStatus);

    try {
      const { error } = await supabase
        .from("usersmodes")
        .update({ mode: newStatus })
        .eq("phone", phoneNumber);

      if (error) {
        console.error("Failed to update status:", error.message);
        // Revert optimistic update on error
        setUserStatus(userStatus);
        
        // Try to create record if it doesn't exist
      
      } else {
        console.log(`Status updated to: ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert optimistic update on error
      setUserStatus(userStatus);
    }
  };

  // Get status dot color
  const getStatusDotStyle = (status: "active" | "semiactive" | "offline") => {
    switch (status) {
      case "active":
        return styles.activeDot;
      case "semiactive":
        return styles.semiactiveDot;
      case "offline":
        return styles.offlineDot;
      default:
        return styles.offlineDot;
    }
  };
  console.log("username",userName)
  const handleOpenChat = (phone: string) => {
    markMessagesAsRead(phone);
    router.push(`/chats/${phone}`);
  };

  const renderChatItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => handleOpenChat(item.phoneNumber)}>
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      ) : (
        <View style={styles.defaultAvatar}>
          <Ionicons name="person" size={24} color="#666" />
        </View>
      )}
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.chatTime}>{item.time}</Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>hi</Text>
            <Text style={styles.username}>{userName || "Loading..."}</Text>
            
          </View>
          <View style={styles.headerIcons}>
            <Ionicons name="search" size={24} color="black" style={{ marginRight: 8 }} />
            <TouchableOpacity onPress={toggleUserStatus} style={styles.statusTouchable}>
              <View style={[styles.statusDot, getStatusDotStyle(userStatus)]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileCircle}
              onPress={() => router.push("/home/settings")}
            >
              <Ionicons name="person" size={20} color="#555" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.chatsSection}>
          <FlatList
            data={conversations}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16, paddingTop: 24 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No conversations yet — start a chat!</Text>
            }
          />
        </View>

        <TouchableOpacity
          style={styles.plusButton}
          onPress={() => router.push("/new-chat")}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: "#E9E9E9" },
  container: { flex: 1, backgroundColor: "#dcd0a8" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 14, fontFamily: "Kreon-Regular", color: "#000" },
  username: { fontSize: 28, fontFamily: "Kreon-Bold", color: "#000" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5D4FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  statusTouchable: {
    padding: 4, // Add padding to make it easier to tap
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#FF9500", // Orange for active
  },
  semiactiveDot: {
    backgroundColor: "#34C759", // Green for semi-active
  },
  offlineDot: {
    backgroundColor: "#C4C4C4", // Grey for offline
  },
  chatsSection: {
    flex: 1,
    backgroundColor: "#E9E9E9",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center",
  },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontFamily: "Kreon-Bold" },
  chatMessage: { fontSize: 14, color: "#555", fontFamily: "Kreon-Regular" },
  chatTime: { fontSize: 12, color: "#999", fontFamily: "Kreon-Regular" },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  plusButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  unreadBadge: {
    backgroundColor: "#34C759",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    minWidth: 20,
    alignItems: "center",
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});