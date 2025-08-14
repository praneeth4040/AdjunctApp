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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Message = {
  id: string;
  sender_phone: string;
  receiver_phone: string;
  message: string;
  created_at: string;
  is_read: boolean;
  reply_to_message?: string;
  is_ai?: boolean;
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export default function ChatScreen({
  onMessagesRead,
}: {
  onMessagesRead?: (phone: string) => void;
}) {
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
  const senderPhone = session?.user?.phone
    ? normalizePhone(session.user.phone)
    : "";

  // Encryption functions
  const SECRET_KEY = [23, 45, 12, 99]; // example key

  function stringToBytes(str: string): number[] {
    return Array.from(new TextEncoder().encode(str));
  }
  
  function bytesToString(bytes: number[]): string {
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  
  function rotateLeft(byte: number, count: number): number {
    return ((byte << count) | (byte >> (8 - count))) & 0xff;
  }
  
  function rotateRight(byte: number, count: number): number {
    return ((byte >> count) | (byte << (8 - count))) & 0xff;
  }
  
  function encrypt(msg: string): string {
    console.log(msg);
    const bytes = stringToBytes(msg);
  
    const encryptedBytes = bytes.map((b, i) => {
      let x = b;
      x = x ^ SECRET_KEY[i % SECRET_KEY.length];
      x = rotateLeft(x, 3);
      x = (x + 7) & 0xff;
      x = x ^ ((SECRET_KEY[i % SECRET_KEY.length] + 13) & 0xff);
      x = rotateLeft(x, 1);
      x = (x * 5) & 0xff;
      x = (x + i) & 0xff;
      return x;
    });
  
    return btoa(String.fromCharCode(...encryptedBytes));
  }
  
  function decrypt(ciphertext: string): string {
    const bytes = atob(ciphertext).split('').map(c => c.charCodeAt(0));
  
    const decryptedBytes = bytes.map((b, i) => {
      let x = b;
      x = (x - i + 256) & 0xff;
      x = (x * 205) & 0xff;
      x = rotateRight(x, 1);
      x = x ^ ((SECRET_KEY[i % SECRET_KEY.length] + 13) & 0xff);
      x = (x - 7 + 256) & 0xff;
      x = rotateRight(x, 3);
      x = x ^ SECRET_KEY[i % SECRET_KEY.length];
      return x;
    });
  
    return bytesToString(decryptedBytes);
  }

  // Track open chat
  useEffect(() => {
    activeChatPhone.current = receiverPhone;
    return () => {
      activeChatPhone.current = null;
    };
  }, [receiverPhone]);

  // Session fetch
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Load + Subscribe
  useEffect(() => {
    if (!senderPhone || !receiverPhone) return;

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

      // Decrypt messages if privacy mode is on
      const processedMessages = privacyMode 
        ? data.map((msg: Message) => ({
            ...msg,
            message: msg.is_ai || !msg.message ? msg.message : decrypt(msg.message),
            reply_to_message: msg.reply_to_message ? decrypt(msg.reply_to_message) : undefined,
          }))
        : data;

      setMessages(processedMessages as Message[]);
      scrollToBottom();
    };

    loadMessages();

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as Message;
          const isInCurrentChat =
            (newMsg.sender_phone === senderPhone &&
              newMsg.receiver_phone === receiverPhone) ||
            (newMsg.sender_phone === receiverPhone &&
              newMsg.receiver_phone === senderPhone);

          if (isInCurrentChat) {
            // Process new message for privacy mode
            const processedMsg = privacyMode
              ? {
                  ...newMsg,
                  message: newMsg.is_ai || !newMsg.message ? newMsg.message : decrypt(newMsg.message),
                  reply_to_message: newMsg.reply_to_message ? decrypt(newMsg.reply_to_message) : undefined,
                }
              : newMsg;

            setMessages((prev) => [...prev, processedMsg]);
            scrollToBottom();

            if (
              newMsg.sender_phone === receiverPhone &&
              activeChatPhone.current === receiverPhone
            ) {
              const { error: updateErr } = await supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMsg.id);

              if (updateErr) console.error("Auto-read error:", updateErr);

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === newMsg.id ? { ...msg, is_read: true } : msg
                )
              );

              onMessagesRead?.(receiverPhone);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMsg.id ? updatedMsg : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderPhone, receiverPhone, privacyMode]);

  // Focus: mark read
  useFocusEffect(
    useCallback(() => {
      if (senderPhone && receiverPhone) {
        markMessagesAsRead();
      }
    }, [senderPhone, receiverPhone])
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      messageRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

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
        prev.map((msg) =>
          msg.sender_phone === receiverPhone ? { ...msg, is_read: true } : msg
        )
      );
      onMessagesRead?.(receiverPhone);
    }
  };

  // AI call
  const fetchAIResponse = async (query: string) => {
    try {
      const res = await fetch('https://c2558650e758.ngrok-free.app/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, sender_phone: senderPhone, receiver_phone: receiverPhone }),
      });

      const data = await res.json();
      return data.reply;
    } catch (err) {
      console.error('AI error:', err);
      return 'AI failed to respond.';
    }
  };

  const sendMessage = async () => {
    console.log("this the input message", input);
    if (!input.trim() || !senderPhone || !receiverPhone) return;

    const text = input.trim();
    console.log("text", text);
    const textToStore = privacyMode ? encrypt(text) : text;
    const replyToStore = replyToMessage && privacyMode ? encrypt(replyToMessage) : replyToMessage;
    console.log("text to store", textToStore);

    const { error } = await supabase.from("messages").insert({
      sender_phone: senderPhone,
      receiver_phone: receiverPhone,
      message: textToStore,
      reply_to_message: replyToStore,
      is_read: false,
    });

    if (error) {
      console.error("Send error:", error.message);
      return;
    }

    setInput("");
    setReplyToMessage(null);
    scrollToBottom();

    // Handle AI command
    if (text.includes('/ai')) {
      const aiQuery = text.split('/ai')[1]?.trim();
      if (aiQuery.length > 0) {
        const aiReply = await fetchAIResponse(aiQuery);
        const replyToStore = privacyMode ? encrypt(aiReply) : aiReply;

        await supabase.from('messages').insert({
          sender_phone: receiverPhone,
          receiver_phone: senderPhone,
          message: replyToStore,
          is_ai: true,
          is_read: false,
        });
      }
    }
  };

  const handleToggleReply = (messageText: string) => {
    if (replyToMessage === messageText) {
      setReplyToMessage(null);
    } else {
      setReplyToMessage(messageText);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMsg = item.sender_phone === senderPhone;
    const isBotMsg = item.is_ai;
    const isReplyMsg = !!item.reply_to_message;

    if (isBotMsg) {
      return (
        <View style={{ alignItems: 'center', marginVertical: 6 }}>
          <View style={[styles.botMsg, { maxWidth: '80%' }]}>
            <Text style={styles.botMsgText}>{item.message}</Text>
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
            style={
              isMyMsg ? styles.myMsg : styles.theirMsg
            }
          >
            {item.message}
          </Text>
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Define theme styles dynamically
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
            style={[
              styles.privacyToggleBtn,
              { backgroundColor: privacyMode ? '#4caf50' : '#d32f2f' },
            ]}
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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
            paddingVertical: 8,
          }}
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
            placeholder="Type your message... (start with /ai for AI)"
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

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 12, 
  },
  header: {
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: "#c1b590",
  },
  title: { 
    fontSize: 20, 
    fontFamily: "Kreon-Bold", 
  },
  privacyToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  privacyToggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  messageWrapper: {
    maxWidth: "75%",
    padding: 8,
    marginVertical: 4,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  myWrapper: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
    borderBottomRightRadius: 4,
  },
  theirWrapper: {
    alignSelf: "flex-start",
    backgroundColor: "#ECECEC",
    borderBottomLeftRadius: 4,
  },
  myMsg: { 
    fontFamily: "Kreon-Regular", 
    color: "#000", 
    fontSize: 16 
  },
  theirMsg: { 
    fontFamily: "Kreon-Regular", 
    color: "#000", 
    fontSize: 16 
  },
  botMsg: {
    backgroundColor: '#FFE7C2',
    padding: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  botMsgText: {
    fontFamily: 'Kreon-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#000',
    fontSize: 16,
  },
  timeText: {
    fontSize: 10,
    color: "#555",
    marginTop: 2,
    alignSelf: "flex-end",
  },
  replyMsgContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
    paddingLeft: 8,
  },
  replyToContainer: {
    backgroundColor: '#e1eaff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  replyToText: {
    color: '#4a90e2',
    fontStyle: 'italic',
    fontSize: 12,
    fontFamily: "Kreon-Regular",
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  replyBannerText: {
    color: '#00796b',
    flex: 1,
    fontFamily: "Kreon-Regular",
  },
  cancelReplyText: {
    color: 'red',
    marginLeft: 12,
    fontWeight: 'bold',
    fontFamily: "Kreon-Bold",
  },
  inputContainer: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    padding: 4,
    borderTopWidth: 1,
    borderColor: "#c1b590",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    fontFamily: "Kreon-Regular",
    borderColor: "#aaa",
  },
  button: {
    backgroundColor: "#b2ffe2",
    width: 45,
    height: 45,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: { 
    fontSize: 18, 
    color: "#000", 
    fontWeight: "bold" 
  },
});

const lightTheme = StyleSheet.create({
  safeArea: {
    backgroundColor: '#DCD0A8',
  },
  container: {
    backgroundColor: '#DCD0A8',
  },
  title: {
    color: '#000',
  },
  inputContainer: {
    backgroundColor: '#DCD0A8',
  },
  input: {
    backgroundColor: '#fff',
    color: '#000',
  },
});

const darkTheme = StyleSheet.create({
  safeArea: {
    backgroundColor: '#121212',
  },
  container: {
    backgroundColor: '#121212',
  },
  title: {
    color: '#fff',
  },
  inputContainer: {
    backgroundColor: '#121212',
  },
  input: {
    backgroundColor: '#333',
    color: '#eee',
    borderColor: '#555',
  },
});