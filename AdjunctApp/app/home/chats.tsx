// home/chats.tsx
import React from "react";
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

const chats = [
  {
    id: "1",
    name: "Alice",
    lastMessage: "Hey, what's up?",
    time: "10:30 AM",
    profileImage: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    id: "2",
    name: "Bob",
    lastMessage: "Got it!",
    time: "Yesterday",
    profileImage: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    id: "3",
    name: "Charlie",
    lastMessage: "See you soon.",
    time: "Mon",
    profileImage: "https://randomuser.me/api/portraits/men/3.jpg",
  },
  {
    id: "4",
    name: "David",
    lastMessage: "Thanks!",
    time: "Sun",
    profileImage: "https://randomuser.me/api/portraits/men/4.jpg",
  },
];

export default function ChatsScreen() {
  const renderChatItem = ({ item }) => (
    <TouchableOpacity style={styles.chatItem}>
      <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatMessage}>{item.lastMessage}</Text>
      </View>
      <Text style={styles.chatTime}>{item.time}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.username}>Praneeth</Text>
        </View>
        <View style={styles.headerIcons}>
          <Ionicons
            name="search"
            size={24}
            color="black"
            style={{ marginRight: 16 }}
          />
          <View style={styles.profileCircle}>
            <Ionicons name="person" size={20} color="#555" />
          </View>
        </View>
      </View>

      {/* Chats Section - single view that holds gray background and rounded top corners */}
      <View style={styles.chatsSection}>
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dcd0a8", // gold header background
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
});
