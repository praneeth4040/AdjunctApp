// ChatScreen.tsx
// IMPORTANT: This MUST be first to fix "no PRNG" for libs like tweetnacl
import 'react-native-get-random-values';
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

import { Linking } from "react-native";

import * as DocumentPicker from "expo-document-picker";
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
import { useLocalSearchParams,useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { getOrCreateKeys, encryptMessage, decryptMessage } from "../../lib/encrypt";
import axios from 'axios';
import * as FileSystem from "expo-file-system";

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
  media_url?: string; // add
  media_type?: "image" | "video" | "document"; // add
  file_name?: string; // add
  file_size?: number; // add
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Keep track of which chat is active (for read receipts)


  const uploadFileToSupabase = async (uri: string, fileName: string, mimeType: string) => {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  
    const filePath = `${Date.now()}-${fileName}`;
  
    const { data, error } = await supabase.storage
      .from("chat-files")
      .upload(filePath, decode(base64), {
        contentType: mimeType,
        upsert: true,
      });
  
    if (error) throw error;
  
    const { data: publicUrlData } = supabase.storage
      .from("chat-files")
      .getPublicUrl(filePath);
  
    return publicUrlData.publicUrl;
  };
  
  // helper: base64 → Uint8Array
  function decode(base64: string) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  

  const insertMediaMessage = async (
    media_url: string,
    media_type: "image" | "video" | "document",
    file_name?: string,
    
  ) => {
    if (!senderPhone || !receiverPhone) return;
  
    try {
      const { error } = await supabase.from("messages").insert({
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
        message: "",
        media_url,
        media_type,
        file_name,
        
        is_read: false,
        mode: privacyMode ? "privacy" : "compatibility",
      });
  
      if (error) throw error;
    } catch (err: any) {
      console.error("Media message insert error:", err);
      Alert.alert("Error", err.message || "Failed to send media");
    }
  };
  
  useEffect(() => {
    activeChatPhone.current = receiverPhone;
    return () => { activeChatPhone.current = null; };
  }, [receiverPhone]);

  // Fetch & listen to session
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Helper: scroll to bottom
  const scrollToBottom = () =>
    setTimeout(() => messageRef.current?.scrollToEnd({ animated: true }), 50);

  // Mark messages as read (all incoming from receiver -> me)
  const markMessagesAsRead = useCallback(async () => {
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

    if ((data as Message[] | null)?.length) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender_phone === receiverPhone ? { ...msg, is_read: true } : msg
        )
      );
      onMessagesRead?.(receiverPhone);
    }
  }, [senderPhone, receiverPhone, onMessagesRead]);

  // Load + decrypt messages & realtime updates
  useEffect(() => {
    if (!senderPhone || !receiverPhone) return;

    let mounted = true;

    const decryptMessages = async (msgs: Message[]) => {
      const { privateKeyBase64 } = await getOrCreateKeys(senderPhone);

      return Promise.all(
        msgs.map(async (msg) => {
          // Encrypted messages
          if (msg.mode === "privacy" && msg.ciphertext && msg.nonce) {
            try {
              const otherPhone =
                msg.sender_phone === senderPhone ? msg.receiver_phone : msg.sender_phone;

              const { data: otherProfile, error: profileErr } = await supabase
                .from("profiles")
                .select("public_key")
                .eq("phone_number", otherPhone)
                .single();

              if (profileErr) throw profileErr;
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

          // If I'm in compatibility mode and it's encrypted, show placeholder
          if (!privacyMode && msg.mode === "privacy") {
            return { ...msg, message: "[Encrypted message]" };
          }

          // Plain compatibility messages unchanged
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

      const decrypted = await decryptMessages((data || []) as Message[]);
      if (!mounted) return;
      setMessages(decrypted);
      scrollToBottom();
    };

    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as Message;

          const isInCurrentChat =
            (newMsg.sender_phone === senderPhone && newMsg.receiver_phone === receiverPhone) ||
            (newMsg.sender_phone === receiverPhone && newMsg.receiver_phone === senderPhone);

          if (!isInCurrentChat) return;

          const decrypted = (await decryptMessages([newMsg]))[0];
          if (!mounted) return;

          setMessages((prev) => [...prev, decrypted]);
          scrollToBottom();

          // Auto mark read for incoming messages to this active chat
          if (
            newMsg.sender_phone === receiverPhone &&
            activeChatPhone.current === receiverPhone
          ) {
            await supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
            setMessages((prev) =>
              prev.map((m) => (m.id === newMsg.id ? { ...m, is_read: true } : m))
            );
            onMessagesRead?.(receiverPhone);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updatedMsg = payload.new as Message;
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [senderPhone, receiverPhone, privacyMode, onMessagesRead]);

  // Mark read when screen focuses
  useFocusEffect(
    useCallback(() => {
      markMessagesAsRead();
      return;
    }, [markMessagesAsRead])
  );

  // Send a message (encrypted or not)
  const sendMessage = async () => {
    if (!input.trim() || !senderPhone || !receiverPhone) return;
    const text = input.trim();
    const replyToStore = replyToMessage;

    try {
      let ciphertext: string | undefined;
      let nonce: string | undefined;

      if (privacyMode) {
        // Ensures PRNG works (thanks to react-native-get-random-values at top)
        const { privateKeyBase64 } = await getOrCreateKeys(senderPhone);
        const { data: receiverProfile, error: rpErr } = await supabase
          .from("profiles")
          .select("public_key")
          .eq("phone_number", receiverPhone)
          .single();

        if (rpErr) throw rpErr;
        if (!receiverProfile?.public_key) throw new Error("Receiver public key not found");

        const encrypted = encryptMessage(text, receiverProfile.public_key, privateKeyBase64);
        ciphertext = encrypted.ciphertext;
        nonce = encrypted.nonce;
      }

      // 🔹 Step 1: Insert user's message
      const { data: inserted, error } = await supabase.from("messages").insert({
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
        message: privacyMode ? "" : text,
        ciphertext,
        nonce,
        mode: privacyMode ? "privacy" : "compatibility",
        reply_to_message: replyToStore ?? null,
        is_read: false,
      }).select().single();

      if (error) throw error;

      // 🔹 Step 2: If it's an AI query in compatibility mode → call Flask AI
      if (!privacyMode && text.startsWith("/ai ")) {
        const query = text.slice(4).trim();
        try {
          const resp = await axios.post("https://44c7dd299c15.ngrok-free.app/ask-ai", {
            query,
            sender_phone: senderPhone,
            receiver_phone: receiverPhone,
          });

          const aiReply = resp.data.reply || "⚠️ AI could not respond.";

          // 🔹 Step 3: Insert AI reply as same user, but `is_ai=true`
          await supabase.from("messages").insert({
            sender_phone: senderPhone,
            receiver_phone: receiverPhone,
            message: aiReply,
            is_ai: true,
            reply_to_message: inserted.id, // link back to the /ai query
            mode: "compatibility",
            is_read: false,
          });
        } catch (aiErr: any) {
          console.error("AI request failed:", aiErr);
          await supabase.from("messages").insert({
            sender_phone: senderPhone,
            receiver_phone: receiverPhone,
            message: "⚠️ AI could not respond right now.",
            is_ai: true,
            reply_to_message: inserted.id,
            mode: "compatibility",
            is_read: false,
          });
        }
      }

      setInput("");
      setReplyToMessage(null);
      scrollToBottom();
    } catch (err: any) {
      console.error("Send failed:", err);
      Alert.alert("Error", err?.message ?? "Failed to send message");
    }
  };

  // Handle multimedia attachment
  const handleMultimedia = () => {
    Alert.alert("Attach Media", "Choose media type", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") return alert("Camera permission is required");
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            const fileName = asset.fileName || `camera-${Date.now()}.jpg`;
            const mimeType = asset.type === "video" ? "video/mp4" : "image/jpeg";
            try {
              const url = await uploadFileToSupabase(asset.uri, fileName, mimeType);
              await insertMediaMessage(
                url,
                mimeType.includes("video") ? "video" : "image",
                fileName,
             

              );
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading media");
            }
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") return alert("Gallery permission is required");
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            const fileName = asset.fileName || `gallery-${Date.now()}`;
            const mimeType = asset.type === "video" ? "video/mp4" : "image/jpeg";
            try {
              const url = await uploadFileToSupabase(asset.uri, fileName, mimeType);
              await insertMediaMessage(
                url,
                mimeType.includes("video") ? "video" : "image",
                fileName,
                
              );
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading media");
            }
          }
        },
      },
      {
        text: "Document",
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
          });
          if (!result.canceled) {
            const file = result.assets[0];
            try {
              const url = await uploadFileToSupabase(
                file.uri,
                file.name,
                file.mimeType || "application/octet-stream"
              );
              await insertMediaMessage(url, "document", file.name);
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading document");
            }
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  
  const handleToggleReply = (messageText: string) => {
    setReplyToMessage((prev) => (prev === messageText ? null : messageText));
  };
  const renderMediaContent = (item: Message) => {
    if (!item.media_url) return null;
  
    switch (item.media_type) {
      case 'image':
        return (
          <TouchableOpacity onPress={() => {/* Open full screen image */}}>
            <Image
              source={{ uri: item.media_url }}
              resizeMode="cover"
              style={{ width: 200, height: 200, borderRadius: 10 }} // <== add this
            />
          </TouchableOpacity>
        );
  
      case 'video':
        return (
          <TouchableOpacity onPress={() => {/* Play video */}}>
            <Image
              source={{ uri: item.media_url }}
              resizeMode="cover"
            />
            <View>
              <Text>▶️</Text>
            </View>
          </TouchableOpacity>
        );
  
      case 'document':
      return (
        <TouchableOpacity
          onPress={() => {
            if (item.media_url) {
              Linking.openURL(item.media_url);
            } else {
              console.warn('No URL available');
              // Optionally alert user or do nothing
            }
          }}
        >
          <View>
            <Text>📄</Text>
          </View>
          <View>
            <Text numberOfLines={1}>
              {item.file_name || 'Document'}
            </Text>
            <Text>
              {item.file_size ? formatFileSize(item.file_size) : 'Unknown size'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    
  
      default:
        return null;
    }
  };
  

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMsg = item.sender_phone === senderPhone;
    const isBotMsg = item.is_ai;
    const isReplyMsg = !!item.reply_to_message;

    const displayMessage =
      !privacyMode && item.mode === "privacy" ? "[Encrypted message]" : item.message;
      if (isMyMsg && isBotMsg) {
        // 🔹 AI reply styled differently
        return (
          <View
            style={[
              styles.messageWrapper,
              styles.aiWrapper,
            ]}
          >
            <Text style={styles.aiMsg}>{displayMessage}</Text>
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        );
      }

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
    
          {renderMediaContent(item)}
    
          {!!displayMessage && (
            <Text
              style={[
                isMyMsg ? styles.myMsg : styles.theirMsg,
                !privacyMode && item.mode === "privacy" && { fontStyle: "italic", color: "#888" },
              ]}
            >
              {displayMessage}
            </Text>
          )}
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

  const themeStyles = privacyMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }, themeStyles.safeArea]}>
      <KeyboardAvoidingView
        style={[styles.container, themeStyles.container]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
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
          {/* Multimedia Button */}
          <TouchableOpacity style={styles.mediaButton} onPress={handleMultimedia}>
            <Text style={styles.mediaIcon}>📎</Text>
          </TouchableOpacity>
          
          <TextInput
            placeholder="Type your message or tap 📎 for media..."
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: "#c1b590"
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
  backButton: { position: "absolute", left: 0, top: 10, width: 44, height: "100%", alignItems: "center", justifyContent: "center", zIndex: 1 },
  backButtonText: { fontSize: 28, color: "#000", fontFamily: "Kreon-Bold" },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    justifyContent: 'space-between'
  },
  replyBannerText: { color: '#00796b', flex: 1, fontFamily: "Kreon-Regular" },
  cancelReplyText: { color: 'red', marginLeft: 12, fontWeight: 'bold', fontFamily: "Kreon-Bold" },
  inputContainer: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    padding: 4,
    borderTopWidth: 1,
    borderColor: "#c1b590",
    marginBottom: 8
  },
  mediaButton: {
    backgroundColor: "#e0e0e0",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4
  },
  mediaIcon: {
    fontSize: 18,
    transform: [{ rotate: '45deg' }] // Rotates the paperclip icon for better visual appeal
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    fontFamily: "Kreon-Regular",
    borderColor: "#aaa"
  },
  button: {
    backgroundColor: "#b2ffe2",
    width: 45,
    height: 45,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: { fontSize: 18, color: "#000", fontWeight: "bold" },
  aiWrapper: {
    alignSelf: "flex-end",
    backgroundColor: "#FFD580", // soft orange
    borderBottomRightRadius: 4,
    padding: 8,
    marginVertical: 4,
    borderRadius: 16,
    maxWidth: "75%",
  },
  aiMsg: {
    fontFamily: "Kreon-Regular",
    color: "#000",
    fontSize: 16,
    fontStyle: "italic",
  },
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