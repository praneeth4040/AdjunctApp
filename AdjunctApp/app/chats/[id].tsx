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
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
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

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);

  const messageRef = useRef<FlatList<Message>>(null);
  const activeChatPhone = useRef<string | null>(null);

  const receiverPhone = normalizePhone((id as string) || "");
  const senderPhone = session?.user?.phone ? normalizePhone(session.user.phone) : "";

  // Track active chat
  useEffect(() => {
    activeChatPhone.current = receiverPhone;
    return () => { activeChatPhone.current = null; };
  }, [receiverPhone]);

  // Fetch session
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  // Load & decrypt messages
  useEffect(() => {
    if (!senderPhone || !receiverPhone) return;

    const decryptMessages = async (msgs: Message[]) => {
      const { privateKeyBase64 } = await getOrCreateKeys(senderPhone);

      return Promise.all(
        msgs.map(async (msg) => {
          if (msg.mode === "privacy" && msg.ciphertext && msg.nonce) {
            try {
              const otherPhone = msg.sender_phone === senderPhone ? msg.receiver_phone : msg.sender_phone;
              const { data: otherProfile } = await supabase
                .from("profiles")
                .select("public_key")
                .eq("phone_number", otherPhone)
                .single();

              if (!otherProfile?.public_key) throw new Error("Other user's public key missing");

              const decrypted = decryptMessage(
                msg.ciphertext,
                msg.nonce,
                otherProfile.public_key,
                privateKeyBase64
              );

              return { ...msg, message: decrypted };
            } catch {
              return { ...msg, message: "[Decryption failed]" };
            }
          }

          // Compatibility mode placeholder
          if (!privacyMode && msg.mode === "privacy") {
            return { ...msg, message: "[Encrypted message]" };
          }

          return msg;
        })
      );
    };

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_phone.eq.${senderPhone},receiver_phone.eq.${receiverPhone}),and(sender_phone.eq.${receiverPhone},receiver_phone.eq.${senderPhone})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

      const decrypted = await decryptMessages(data as Message[]);
      setMessages(decrypted);
      scrollToBottom();
    };

    loadMessages();

    const channel = supabase
      .channel("messages-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMsg = payload.new as Message;
        const isInCurrentChat =
          (newMsg.sender_phone === senderPhone && newMsg.receiver_phone === receiverPhone) ||
          (newMsg.sender_phone === receiverPhone && newMsg.receiver_phone === senderPhone);

        if (isInCurrentChat) {
          const decrypted = (await decryptMessages([newMsg]))[0];
          setMessages((prev) => [...prev, decrypted]);
          scrollToBottom();

          if (newMsg.sender_phone === receiverPhone && activeChatPhone.current === receiverPhone) {
            await supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
            setMessages((prev) =>
              prev.map((msg) => (msg.id === newMsg.id ? { ...msg, is_read: true } : msg))
            );
            onMessagesRead?.(receiverPhone);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updatedMsg = payload.new as Message;
        setMessages((prev) => prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg)));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [senderPhone, receiverPhone, privacyMode]);

  // Focus effect (TypeScript-safe)
  useFocusEffect(
    useCallback(() => {
      const markRead = async () => {
        try {
          await markMessagesAsRead();
        } catch (err) {
          console.error(err);
        }
      };
      markRead();
      return;
    }, [senderPhone, receiverPhone])
  );

  const scrollToBottom = () => setTimeout(() => messageRef.current?.scrollToEnd({ animated: true }), 50);

  const markMessagesAsRead = async () => {
    if (!senderPhone || !receiverPhone) return;

    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_phone", receiverPhone)
      .eq("receiver_phone", senderPhone)
      .eq("is_read", false)
      .select();

    if (error) {
      console.error("Mark read error:", error);
      return;
    }

    if ((data as Message[]).length > 0) {
      setMessages((prev) =>
        prev.map((msg) => (msg.sender_phone === receiverPhone ? { ...msg, is_read: true } : msg))
      );
      onMessagesRead?.(receiverPhone);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !senderPhone || !receiverPhone) return;
    const text = input.trim();
    const replyToStore = replyToMessage;

    try {
      let ciphertext: string | undefined;
      let nonce: string | undefined;

      if (privacyMode) {
        const { privateKeyBase64 } = await getOrCreateKeys(senderPhone);
        const { data: receiverProfile } = await supabase
          .from("profiles")
          .select("public_key")
          .eq("phone_number", receiverPhone)
          .single();

        if (!receiverProfile?.public_key) throw new Error("Receiver public key not found");

        const encrypted = encryptMessage(text, receiverProfile.public_key, privateKeyBase64);
        ciphertext = encrypted.ciphertext;
        nonce = encrypted.nonce;
      }

      const { error } = await supabase.from("messages").insert({
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
        message: privacyMode ? "" : text,
        ciphertext,
        nonce,
        mode: privacyMode ? "privacy" : "compatibility",
        reply_to_message: replyToStore,
        is_read: false,
      });

      if (error) throw error;

      setInput("");
      setReplyToMessage(null);
      scrollToBottom();
    } catch (err: any) {
      console.error("Send failed:", err);
      Alert.alert("Error", err.message || "Failed to send message");
    }
  };

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={styles.header}>
          <Text style={[styles.title, themeStyles.title]}>Chat with {receiverPhone}</Text>
          <TouchableOpacity
            onPress={() => setPrivacyMode(!privacyMode)}
            style={[styles.privacyToggleBtn, { backgroundColor: privacyMode ? '#4caf50' : '#d32f2f' }]}
          >
            <Text style={styles.privacyToggleText}>
              {privacyMode ? 'Privacy ON' : 'Compatibility'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={messageRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end", paddingVertical: 8 }}
        />

        {replyToMessage && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText}>Replying to: {replyToMessage}</Text>
            <TouchableOpacity onPress={() => setReplyToMessage(null)}>
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputContainer, themeStyles.inputContainer]}>
          <TextInput
            placeholder="Type your message..."
            placeholderTextColor={privacyMode ? '#bbb' : '#5c5340'}
            style={[styles.input, themeStyles.input]}
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.button} onPress={sendMessage}>
            <Text style={styles.buttonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles remain mostly the same ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 12 },
  header: { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: "#c1b590" },
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
});

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
