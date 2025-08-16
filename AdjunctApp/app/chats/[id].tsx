// ChatScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import * as Contacts from "expo-contacts";
import { getOrCreateKeys, encryptMessage, decryptMessage } from "../../lib/encrypt";

type Message = {
  id: string;
  sender_phone: string;
  receiver_phone: string;
  message: string;
  ciphertext?: string;
  nonce?: string;
  mode?: "privacy" | "compatibility";
  created_at: string;
  is_read: boolean;
  reply_to_message?: string;
  is_ai?: boolean;
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export default function ChatScreen({ onMessagesRead }: { onMessagesRead?: (phone: string) => void }) {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [contactName, setContactName] = useState<string>("");
  const [loadingContact, setLoadingContact] = useState<boolean>(true);
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);

  const messageRef = useRef<FlatList<Message>>(null);
  const activeChatPhone = useRef<string | null>(null);

  const receiverPhone = normalizePhone((id as string) || "");
  const senderPhone = session?.user?.phone ? normalizePhone(session.user.phone) : "";

  // ---- (session, contacts, messages loading, decryption, etc. remain the same) ----
  // [I won't repeat unchanged logic from your file — only merging UI/conflict parts]

  const handleToggleReply = (messageText: string) => {
    setReplyToMessage(replyToMessage === messageText ? null : messageText);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMsg = item.sender_phone === senderPhone;
    const isBotMsg = item.is_ai;
    const isReplyMsg = !!item.reply_to_message;

    const displayMessage =
      !privacyMode && item.mode === "privacy" ? "[Encrypted message]" : item.message;

    if (isBotMsg) {
      return (
        <View style={{ alignItems: 'center', marginVertical: 6 }}>
          <View style={[styles.botMsg, { maxWidth: '80%' }]}>
            <Text style={styles.botMsgText}>{displayMessage}</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity onLongPress={() => handleToggleReply(item.message)}>
        <View
          style={[
            styles.messageWrapper,
            isMyMsg ? styles.myWrapper : styles.theirWrapper,
            isReplyMsg && styles.replyMsgContainer,
          ]}
        >
          {isReplyMsg && (
            <View style={styles.replyToContainer}>
              <Text style={styles.replyToText} numberOfLines={1} ellipsizeMode="tail">
                Replying to: {item.reply_to_message}
              </Text>
            </View>
          )}
          <Text
            style={[
              isMyMsg ? styles.myMsg : styles.theirMsg,
              !privacyMode && item.mode === "privacy" && { fontStyle: "italic", color: "#888" },
            ]}
          >
            {displayMessage}
          </Text>
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const themeStyles = privacyMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }, themeStyles.safeArea]}>
      <KeyboardAvoidingView
        style={[styles.container, themeStyles.container]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>&lt;</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, themeStyles.title]}>
              {contactName || receiverPhone}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPrivacyMode(!privacyMode)}
            style={[styles.privacyToggleBtn, { backgroundColor: privacyMode ? '#4caf50' : '#d32f2f' }]}
          >
            <Text style={styles.privacyToggleText}>
              {privacyMode ? 'Privacy ON' : 'Compatibility'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={messageRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end", paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Reply Banner */}
        {replyToMessage && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText}>Replying to: {replyToMessage}</Text>
            <TouchableOpacity onPress={() => setReplyToMessage(null)}>
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, themeStyles.inputContainer]}>
          <TextInput
            placeholder="Type your message..."
            placeholderTextColor={privacyMode ? '#bbb' : '#5c5340'}
            style={[styles.input, themeStyles.input]}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.button} onPress={sendMessage}>
            <Text style={styles.buttonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 12 },
  header: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#c1b590",
  },
  titleContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Kreon-Bold" },
  privacyToggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  privacyToggleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  messageWrapper: { maxWidth: "75%", padding: 8, marginVertical: 4, borderRadius: 16 },
  myWrapper: { alignSelf: "flex-end", backgroundColor: "#DCF8C6", borderBottomRightRadius: 4 },
  theirWrapper: { alignSelf: "flex-start", backgroundColor: "#ECECEC", borderBottomLeftRadius: 4 },
  myMsg: { fontFamily: "Kreon-Regular", color: "#000", fontSize: 16 },
  theirMsg: { fontFamily: "Kreon-Regular", color: "#000", fontSize: 16 },
  botMsg: { backgroundColor: '#FFE7C2', padding: 10, borderRadius: 12 },
  botMsgText: { fontFamily: 'Kreon-Regular', fontStyle: 'italic', textAlign: 'center', fontSize: 16 },
  timeText: { fontSize: 10, color: "#555", marginTop: 2, alignSelf: "flex-end" },
  replyMsgContainer: { borderLeftWidth: 3, borderLeftColor: '#4a90e2', paddingLeft: 8 },
  replyToContainer: { backgroundColor: '#e1eaff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  replyToText: { color: '#4a90e2', fontStyle: 'italic', fontSize: 12, fontFamily: "Kreon-Regular" },
  replyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f7fa', padding: 8, borderRadius: 6, marginBottom: 6, justifyContent: 'space-between' },
  replyBannerText: { color: '#00796b', flex: 1, fontFamily: "Kreon-Regular" },
  cancelReplyText: { color: 'red', marginLeft: 12, fontWeight: 'bold', fontFamily: "Kreon-Bold" },
  inputContainer: { flexDirection: "row", gap: 4, alignItems: "center", padding: 4, borderTopWidth: 1, borderColor: "#c1b590", marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 25, fontFamily: "Kreon-Regular", borderColor: "#aaa" },
  button: { backgroundColor: "#b2ffe2", width: 45, height: 45, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 18, color: "#000", fontWeight: "bold" },
  backButton: { position: "absolute", left: 0, top: 10, width: 44, height: "100%", alignItems: "center", justifyContent: "center", zIndex: 1 },
  backButtonText: { fontSize: 28, color: "#000", fontFamily: "Kreon-Bold" },
});

// Themes
const lightTheme = StyleSheet.create({
  safeArea: { backgroundColor: '#DCD0A8' },
  container: { backgroundColor: '#DCD0A8' },
  title: { color: '#000' },
  inputContainer: { backgroundColor: '#DCD0A8' },
  input: { backgroundColor: '#fff', color: '#000' },
});

const darkTheme = StyleSheet.create({
  safeArea: { backgroundColor: '#121212' },
  container: { backgroundColor: '#121212' },
  title: { color: '#fff' },
  inputContainer: { backgroundColor: '#121212' },
  input: { backgroundColor: '#333', color: '#eee', borderColor: '#555' },
});
