import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { initLocalDB, fullSync } from "../../library/database";

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[1] || "chats";
  
  // Add loading state for better UX
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log("🔄 Initializing database...");
        await initLocalDB();
        console.log("✅ Database initialized successfully");
        
        setIsDbInitialized(true);
        
        // Optional: Do initial sync on app start
        // Only sync after successful DB initialization
        try {
          console.log("🔄 Starting initial sync...");
          await fullSync();
          console.log("✅ Initial sync completed");
        } catch (syncError) {
          console.warn("⚠️ Initial sync failed, but app can continue:", syncError);
          // Don't block the app if sync fails - user can sync manually later
        }
        
      } catch (error) {
        console.error("❌ Database initialization failed:", error);
        setInitError(error instanceof Error ? error.message : "Database initialization failed");
      }
    };

    initializeDatabase();
  }, []); // Empty dependency array = runs once when layout mounts

  // Show loading screen while database is initializing
  if (!isDbInitialized && !initError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing app...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error screen if database initialization failed
  if (initError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Initialization Failed</Text>
          <Text style={styles.errorMessage}>{initError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setInitError(null);
              setIsDbInitialized(false);
              // Re-run initialization
              useEffect(() => {
                const initializeDatabase = async () => {
                  try {
                    await initLocalDB();
                    setIsDbInitialized(true);
                  } catch (error) {
                    setInitError(error instanceof Error ? error.message : "Database initialization failed");
                  }
                };
                initializeDatabase();
              }, []);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Slot />
      </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF3B30",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
}); 