import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[1] || "chats"; // detect current page inside /home/*

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* This renders the current route (chats.tsx / ai.tsx / todo.tsx) */}
      <View style={styles.content}>
        <Slot />
      </View>

      {/* Fixed Footer */}
      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.push("/home/chats")}
          style={styles.tab}
        >
          <Ionicons
            name="chatbubbles"
            size={26}
            color={current === "chats" ? "#007AFF" : "#dcd0a8"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/home/ai")}
          style={styles.tab}
        >
          <Ionicons
            name="sparkles"
            size={26}
            color={current === "ai" ? "#007AFF" : "#dcd0a8"}
          />
        </TouchableOpacity>

        {/* New Todo Tab */}
        <TouchableOpacity
          onPress={() => router.push("/home/Todo")}
          style={styles.tab}
        >
          <Ionicons
            name="list"
            size={26}
            color={current === "Todo" ? "#007AFF" : "#dcd0a8"}
          />
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  content: { flex: 1 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  tab: { flex: 1, alignItems: "center" },
});
