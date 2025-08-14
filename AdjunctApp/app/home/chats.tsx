  import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
} from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import { Ionicons } from "@expo/vector-icons";
  import { supabase } from "../../lib/supabase";
  import { useRouter, useFocusEffect } from "expo-router";
  import * as Contacts from "expo-contacts";

  interface Conversation {
    id: string | number;
    phoneNumber: string;
    name: string;
    profileImage: string;
    lastMessage: string;
    time: string;
    unreadCount: number;
  }

  interface SupabaseMessage {
    id: string | number;
    sender_phone: string;
    receiver_phone: string;
    message: string;
    created_at: string;
    is_read: boolean;
  }

  export default function ChatsScreen() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [userName, setUserName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [contactsMap, setContactsMap] = useState<Record<string, string>>({});
    const [allContacts, setAllContacts] = useState<Array<{name: string, phoneNumber: string}>>([]);
    const [filteredContacts, setFilteredContacts] = useState<Array<{name: string, phoneNumber: string}>>([]);
    const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const router = useRouter();

    const normalizePhone = (phone?: string) =>
      phone?.replace(/\D/g, "") || "";

    const loadContacts = async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") return;

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      const phoneMap: Record<string, string> = {};
      const contactsList: Array<{name: string, phoneNumber: string}> = [];
      
      data.forEach((contact) => {
        contact.phoneNumbers?.forEach((num) => {
          const clean = normalizePhone(num.number);
          if (clean) {
            phoneMap[clean] = contact.name || "";
            contactsList.push({
              name: contact.name || clean,
              phoneNumber: clean
            });
          }
        });
      });

      setContactsMap(phoneMap);
      setAllContacts(contactsList);
      setFilteredContacts(contactsList);
    };

    const fetchUserAndContacts = useCallback(async () => {
      await loadContacts();

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
      setPhoneNumber(phone);

      if (phone) {
        await fetchConversations(phone);
        subscribeToMessages(phone);
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
        };
      });

      setConversations(result);
      setFilteredConversations(result);
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
          ) return;

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
      };
    }, [fetchUserAndContacts]);

    const handleOpenChat = (phone: string) => {
      markMessagesAsRead(phone);
      router.push(`/chats/${phone}`);
    };

    const handleSearch = (query: string) => {
      setSearchQuery(query);
      if (query.trim() === "") {
        setFilteredConversations(conversations);
        setFilteredContacts(allContacts);
        setIsSearchActive(false);
      } else {
        // Filter conversations
        const filtered = conversations.filter((conv) =>
          conv.name.toLowerCase().includes(query.toLowerCase()) ||
          conv.phoneNumber.includes(query)
        );
        setFilteredConversations(filtered);
        
        // Filter contacts
        const filteredContacts = allContacts.filter((contact) =>
          contact.name.toLowerCase().includes(query.toLowerCase()) ||
          contact.phoneNumber.includes(query)
        );
        setFilteredContacts(filteredContacts);
        setIsSearchActive(true);
      }
    };

    const clearSearch = () => {
      setSearchQuery("");
      setFilteredConversations(conversations);
      setFilteredContacts(allContacts);
      setIsSearchActive(false);
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

    const renderContactItem = ({ item }: { item: {name: string, phoneNumber: string} }) => (
      <TouchableOpacity style={styles.contactItem} onPress={() => handleOpenChat(item.phoneNumber)}>
        <View style={styles.defaultAvatar}>
          <Ionicons name="person" size={24} color="#666" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        </View>
        <View style={styles.newChatIcon}>
          <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
        </View>
      </TouchableOpacity>
    );

    return (
      <View style={styles.outerContainer}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good morning</Text>
              <Text style={styles.username}>{userName || "Loading..."}</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => setIsSearchActive(!isSearchActive)}
              >
                <Ionicons name="search" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileCircle}
                onPress={() => router.push("/home/settings")}
              >
                <Ionicons name="person" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
          
          {isSearchActive && (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search contacts..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
                     <View style={styles.chatsSection}>
             {isSearchActive ? (
               <FlatList
                 data={filteredContacts}
                 renderItem={renderContactItem}
                 keyExtractor={(item) => item.phoneNumber}
                 contentContainerStyle={{ padding: 16, paddingTop: 24 }}
                 showsVerticalScrollIndicator={false}
                 ListEmptyComponent={
                   <Text style={styles.emptyText}>No contacts found</Text>
                 }
               />
             ) : (
               <FlatList
                 data={filteredConversations}
                 renderItem={renderChatItem}
                 keyExtractor={(item) => item.id.toString()}
                 contentContainerStyle={{ padding: 16, paddingTop: 24 }}
                 showsVerticalScrollIndicator={false}
                 ListEmptyComponent={
                   <Text style={styles.emptyText}>No conversations yet — start a chat!</Text>
                 }
               />
             )}
           </View>

          {/* Floating + Button */}
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
    searchButton: {
      marginRight: 16,
      padding: 4,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 25,
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: "Kreon-Regular",
      color: "#000",
    },
    clearButton: {
      marginLeft: 8,
      padding: 2,
    },
    contactItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#ddd",
    },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 16, fontFamily: "Kreon-Bold" },
    contactPhone: { fontSize: 14, color: "#666", fontFamily: "Kreon-Regular" },
    newChatIcon: {
      padding: 8,
    },
  });
