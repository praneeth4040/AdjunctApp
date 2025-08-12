// home/chats.tsx
import React, { useState, useEffect } from "react";
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
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router"; // ✅ navigation

export default function ChatsScreen() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string>("");

  const router = useRouter(); // ✅ initialize router

  useEffect(() => {
    fetchUser();
  }, []);

  // Step 1: Fetch current user info
  const fetchUser = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("name,phone_number,profile_picture")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setUserName(data?.name || "User");
      setPhoneNumber(data?.phone_number || "");
      setProfilePicture(data?.profile_picture || "");

      if (data?.phone_number) {
        fetchConversations(data.phone_number);
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  // Step 2: Fetch latest conversations
  const fetchConversations = async (currentUserPhone: string) => {
    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_phone.eq.${currentUserPhone},receiver_phone.eq.${currentUserPhone}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const latestMessagesMap = new Map();

      messages.forEach((msg) => {
        const partnerPhone =
          msg.sender_phone === currentUserPhone
            ? msg.receiver_phone
            : msg.sender_phone;

        if (!latestMessagesMap.has(partnerPhone)) {
          latestMessagesMap.set(partnerPhone, msg);
        }
      });

      const conversationsArray = Array.from(latestMessagesMap.values());

      const partnerPhones = Array.from(latestMessagesMap.keys());

      if (partnerPhones.length === 0) {
        setConversations([]);
        return;
      }

      const { data: partners, error: partnersError } = await supabase
        .from("profiles")
        .select("name, phone_number, profile_picture")
        .in("phone_number", partnerPhones);

      if (partnersError) throw partnersError;

      const conversationsWithInfo = conversationsArray.map((msg) => {
        const partnerPhone =
          msg.sender_phone === currentUserPhone
            ? msg.receiver_phone
            : msg.sender_phone;

        const partner = partners.find((p) => p.phone_number === partnerPhone);

        return {
          id: msg.id,
          phoneNumber: partnerPhone, // ✅ will be used for navigation
          name: partner?.name || partnerPhone, // show phone if no name
          profileImage: partner?.profile_picture || "",
          lastMessage: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      });

      setConversations(conversationsWithInfo);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  const handlePlusPress = () => {
    router.push('/new-chat')
  };

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chats/${item.phoneNumber}`)} // ✅ navigate
    >
      {item.profileImage ? (
        <Image
          source={{ uri: item.profileImage }}
          style={styles.avatar}
        />
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
      <Text style={styles.chatTime}>{item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.username}>
              {userName || "Loading..."}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <Ionicons
              name="search"
              size={24}
              color="black"
              style={{ marginRight: 16 }}
            />
            <View style={styles.profileCircle}>
            <TouchableOpacity style={styles.profileCircle} onPress={() => router.push('/home/settings')}>
              <Ionicons name="person" size={20} color="#555" />
            </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Chats Section */}
        <View style={styles.chatsSection}>
          <FlatList
            data={conversations}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={{ padding: 16, paddingTop: 24 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No conversations yet — start a chat!
              </Text>
            }
          />
        </View>
      </SafeAreaView>

      {/* Floating Plus Button - positioned in safe area */}
      <SafeAreaView style={styles.buttonSafeArea} edges={["bottom"]}>
        <TouchableOpacity 
          style={styles.plusButton} 
          onPress={handlePlusPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#E9E9E9", // Gray background extends to bottom
  },
  container: {
    flex: 1,
    backgroundColor: "#dcd0a8",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Kreon-Regular",
    color: "#000",
  },
  username: {
    fontSize: 28,
    fontFamily: "Kreon-Bold",
    color: "#000",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center",
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontFamily: "Kreon-Bold",
  },
  chatMessage: {
    fontSize: 14,
    color: "#555",
    fontFamily: "Kreon-Regular",
  },
  chatTime: {
    fontSize: 12,
    color: "#999",
    fontFamily: "Kreon-Regular",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
  },
  buttonSafeArea: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  plusButton: {
    margin: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF", // iOS blue color
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8, // Android shadow
  },
});