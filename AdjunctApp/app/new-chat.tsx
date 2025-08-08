// app/new-chat.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Contacts from "expo-contacts";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";

type ContactItem = {
  id: string;
  name: string;
  phoneNumbers: string[];
  profile_picture: string | null;
  isUser: boolean;
};

/**
 * Normalize phone numbers to DB format:
 * - Remove all non-digits (including +)
 * - If 10 digits → prepend 91
 * - If starts with 91 and has 12 digits → keep
 */
const normalizePhoneNumber = (num: string, defaultCountryCode = "91") => {
  let cleaned = num.replace(/\D/g, ""); // only digits

  if (cleaned.length === 10) {
    return defaultCountryCode + cleaned; // local number
  }
  if (cleaned.startsWith(defaultCountryCode) && cleaned.length === 12) {
    return cleaned; // already formatted
  }
  return cleaned; // fallback for international numbers
};

/** Utility: Split array into chunks */
const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export default function NewChatScreen() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Contacts permission is required");
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      if (!data || data.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // Normalize & deduplicate numbers (no +, DB format)
      const allNumbers = data.flatMap((contact) =>
        contact.phoneNumbers
          ?.map((pn) =>
            pn.number ? normalizePhoneNumber(pn.number) : null
          )
          .filter((num): num is string => !!num) || []
      );

      const uniqueNumbers = Array.from(new Set(allNumbers));

      console.log("Unique normalized numbers (query format):", uniqueNumbers);

      // Query Supabase in chunks
      let matchedUsers: any[] = [];
      for (const chunk of chunkArray(uniqueNumbers, 100)) {
        const { data: users, error } = await supabase
          .from("profiles")
          .select("name, phone_number, profile_picture")
          .in("phone_number", chunk);

        if (error) {
          console.error("Supabase error:", error);
        }
        if (users) {
          console.log("Matched from Supabase:", users);
          matchedUsers.push(...users);
        }
      }

      // Merge contacts with matched users
      const merged = data.map((contact) => {
        const normalized = contact.phoneNumbers
          ?.map((pn) =>
            pn.number ? normalizePhoneNumber(pn.number) : null
          )
          .filter((num): num is string => !!num) || [];

        const match = matchedUsers.find((u) =>
          normalized.includes(u.phone_number)
        );

        return {
          id: contact.id,
          name: contact.name || "Unknown",
          phoneNumbers: normalized,
          profile_picture: match?.profile_picture || null,
          isUser: !!match,
        } as ContactItem;
      });

      // Sort: Adjunct users first
      merged.sort((a, b) => Number(b.isUser) - Number(a.isUser));

      setContacts(merged);
    } catch (err) {
      console.error("Error loading contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderContact = ({ item }: { item: ContactItem }) => {
    const firstNumber = item.phoneNumbers?.[0] || "";

    return (
      <TouchableOpacity
        style={[styles.contactItem, !item.isUser && styles.disabledContact]}
        disabled={!item.isUser}
        onPress={() => {
          if (item.isUser && firstNumber) {
            router.push(`/chats/${firstNumber}`);
          }
        }}
      >
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={{ color: "#555" }}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.contactName}>{item.name}</Text>
          {!item.isUser && (
            <Text style={styles.inviteText}>Invite to Adjunct</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : contacts.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No contacts found.
        </Text>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  disabledContact: { opacity: 0.5 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactName: { fontSize: 16, fontWeight: "500" },
  inviteText: { fontSize: 12, color: "green" },
});
