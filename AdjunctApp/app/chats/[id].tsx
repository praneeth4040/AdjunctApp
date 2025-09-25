// ChatScreen.tsx
// IMPORTANT: This MUST be first to fix "no PRNG" for libs like tweetnacl
import 'react-native-get-random-values';
import * as ImagePicker from "expo-image-picker";
import { Image, Animated, Dimensions } from "react-native";

import { Linking } from "react-native";
import {Audio} from "expo-av"

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
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams,useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { getOrCreateKeys, encryptMessage, decryptMessage } from "../../lib/encrypt";
import axios from 'axios';
import * as FileSystem from "expo-file-system";

const { width: screenWidth } = Dimensions.get('window');

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
  media_url?: string;
  media_type?: "image" | "video" | "document"|"audio";
  file_name?: string;
  file_size?: number;
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState<{[key: string]: boolean}>({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaModal, setMediaModal] = useState<{visible: boolean, uri: string, type: 'image' | 'video'}>({
    visible: false,
    uri: '',
    type: 'image'
  });
  const [selectionMode, setSelectionMode] = useState(false);
const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
const [showForwardModal, setShowForwardModal] = useState(false);
const [contacts, setContacts] = useState<{phone: string, name: string}[]>([]);
const [showClearChatModal, setShowClearChatModal] = useState(false);
const [contactSearch, setContactSearch] = useState("");
  
  const messageRef = useRef<FlatList<Message>>(null);
  const activeChatPhone = useRef<string | null>(null);
  const recordingTimer = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const receiverPhone = normalizePhone((id as string) || "");
  const senderPhone = session?.user?.phone ? normalizePhone(session.user.phone) : "";

  const getUserMode = async (phone: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("usersmodes")
        .select("mode")
        .eq("phone", senderPhone)
        .single();
  
      if (error) {
        console.error("Error fetching user mode:", error);
        return null;
      }
  
      return data?.mode || null;
    } catch (err) {
      console.error("getUserMode error:", err);
      return null;
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.phone.includes(contactSearch)
  );

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      
      // Exit selection mode if no messages selected
      if (newSet.size === 0) {
        setSelectionMode(false);
      }
      
      return newSet;
    });
  };
  
  const enterSelectionMode = (messageId: string) => {
    setSelectionMode(true);
    setSelectedMessages(new Set([messageId]));
  };
  
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  };
  
  const selectAllMessages = () => {
    const allMessageIds = new Set(messages.map(msg => msg.id));
    setSelectedMessages(allMessageIds);
  };

  const deleteSelectedMessages = async () => {
    try {
      const messageIds = Array.from(selectedMessages);
      
      const { error } = await supabase
        .from("messages")
        .delete()
        .in('id', messageIds);
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
      exitSelectionMode();
      Alert.alert("Success", `${messageIds.length} message(s) deleted`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete messages");
    }
  };
  
  const clearAllChat = async () => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .or(`and(sender_phone.eq.${senderPhone},receiver_phone.eq.${receiverPhone}),and(sender_phone.eq.${receiverPhone},receiver_phone.eq.${senderPhone})`);
      
      if (error) throw error;
      
      setMessages([]);
      setShowClearChatModal(false);
      Alert.alert("Success", "Chat cleared successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to clear chat");
    }
  };

  const forwardMessages = async (targetPhone: string) => {
    try {
      const messagesToForward = messages.filter(msg => selectedMessages.has(msg.id));
      
      for (const msg of messagesToForward) {
        let messageContent = msg.message;
        let mediaUrl = msg.media_url;
        
        // Handle encrypted messages
        if (privacyMode && msg.ciphertext && msg.nonce) {
          messageContent = msg.message; // Already decrypted in current view
        }
        
        await supabase.from("messages").insert({
          sender_phone: senderPhone,
          receiver_phone: targetPhone,
          message: messageContent,
          media_url: mediaUrl,
          media_type: msg.media_type,
          file_name: msg.file_name,
          file_size: msg.file_size,
          mode: "compatibility", // Forward as compatibility mode
          is_read: false,
        });
      }
      
      setShowForwardModal(false);
      exitSelectionMode();
      Alert.alert("Success", `${messagesToForward.length} message(s) forwarded`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to forward messages");
    }
  };

  const loadContacts = async () => {
    try {
      console.log("Loading contacts for sender:", senderPhone);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("phone_number, name")  // Changed from display_name to name
        .neq("phone_number", senderPhone);
      
      console.log("Supabase response:", { data, error });
      
      if (error) throw error;
      
      const contactList = (data || []).map(profile => ({
        phone: profile.phone_number,
        name: profile.name || profile.phone_number  // Use name column
      }));
      
      console.log("Final contacts:", contactList);
      setContacts(contactList);
    } catch (err) {
      console.error("Load contacts error:", err);
    }
  };
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Animation for recording pulse
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  useEffect(() => {
    activeChatPhone.current = receiverPhone;
    return () => { activeChatPhone.current = null; };
  }, [receiverPhone]);

  const uploadFileToSupabase = async (uri: string, fileName: string, mimeType: string) => {
    setUploadingMedia(true);
    try {
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
    } finally {
      setUploadingMedia(false);
    }
  };
  
  function decode(base64: string) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  const startRecording = async () => {
    try {
      console.log("🎙️ Starting recording...");
  
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required");
        return;
      }
  
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 0,
        interruptionModeAndroid: 1,
      });
  
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
  
      setRecording(recording);
      setRecordingDuration(0);
      startPulseAnimation();
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000) as unknown as number;
      
      console.log("✅ Recording started");
    } catch (err) {
      console.error("startRecording error:", err);
    }
  };
  
  const stopRecording = async () => {
    if (!recording) return;
    
    stopPulseAnimation();
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setRecordingDuration(0);
  
    if (uri) {
      const fileName = `audio-${Date.now()}.m4a`;
      try {
        const url = await uploadFileToSupabase(uri, fileName, "audio/m4a");
        await insertMediaMessage(url, "audio", fileName);
      } catch (err: any) {
        Alert.alert("Upload Failed", err.message || "Error uploading audio");
      }
    }
  };

  const playAudio = async (uri: string, messageId: string) => {
    try {
      setIsPlaying(prev => ({...prev, [messageId]: true}));
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(prev => ({...prev, [messageId]: false}));
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(prev => ({...prev, [messageId]: false}));
    }
  };

  const insertMediaMessage = async (
    media_url: string,
    media_type: "image" | "video" | "document"|"audio",
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

  const scrollToBottom = () =>
    setTimeout(() => messageRef.current?.scrollToEnd({ animated: true }), 50);

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

      const decrypted = await decryptMessages((data || []) as Message[]);
      if (!mounted) return;
      setMessages(decrypted);
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
      
          if (newMsg.is_ai) return;
      
          const isInCurrentChat =
            (newMsg.sender_phone === senderPhone && newMsg.receiver_phone === receiverPhone) ||
            (newMsg.sender_phone === receiverPhone && newMsg.receiver_phone === senderPhone);
      
          if (!isInCurrentChat) return;
      
          const decrypted = (await decryptMessages([newMsg]))[0];
          if (!mounted) return;
      
          setMessages((prev) => [...prev, decrypted]);
          scrollToBottom();
      
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
          if (newMsg.sender_phone === receiverPhone) {
            await updateConversationAfterSending(
              senderPhone, 
              receiverPhone, 
              decrypted.message || "New message"
            );
          }
          try {
            const { data: modeRow } = await supabase
              .from("usersmodes")
              .select("mode")
              .eq("phone", receiverPhone)
              .single();
      
            if (!modeRow) return;
            const mode = modeRow.mode;
      
            if (mode === "active") {
              await handleAI(decrypted.message);
            } else if (mode === "semiactive") {
              await handleAI(decrypted.message);
            }
          } catch (err) {
            console.error("AI Auto-responder error:", err);
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

  useFocusEffect(
    useCallback(() => {
      markMessagesAsRead();
      return;
    }, [markMessagesAsRead])
  );

  // Add this useEffect to trigger loadContacts when forward modal opens
useEffect(() => {
  if (showForwardModal) {
    console.log("Forward modal opened, loading contacts...");
    loadContacts();
  }
}, [showForwardModal]);
  const handleAI = async (query: string): Promise<string> => {
    try {
      const resp = await axios.post("https://e763ecf5a4cb.ngrok-free.app/ask-ai", {
        query,
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
      });
  
      const reply = resp.data.reply || "⚠️ AI could not respond.";
  
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_phone: receiverPhone,
            receiver_phone: senderPhone,
            message: reply,
            is_ai: true,
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
  
      if (error) {
        console.error("Supabase insert error:", error);
      } else {
        console.log("AI message inserted:", data);
        await updateConversationAfterSending(receiverPhone, senderPhone, reply);
      }
  
      return reply;
    } catch (error: any) {
      console.error("AI request failed:", error);
      return "⚠️ AI could not respond right now.";
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

      await updateConversationAfterSending(senderPhone, receiverPhone, privacyMode ? "🔒 Encrypted message" : text);
      if (!privacyMode && text.startsWith("/ai ")) {
        const query = text.slice(4).trim();
        try {
          const resp = await axios.post("https://e763ecf5a4cb.ngrok-free.app/ask-ai", {
            query,
            sender_phone: senderPhone,
            receiver_phone: receiverPhone,
          });

          const aiReply = resp.data.reply || "⚠️ AI could not respond.";

          await supabase.from("messages").insert({
            sender_phone: senderPhone,
            receiver_phone: receiverPhone,
            message: aiReply,
            is_ai: true,
            reply_to_message: inserted.id,
            mode: "compatibility",
            is_read: false,
          });
          await updateConversationAfterSending(senderPhone, receiverPhone, aiReply);
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
          await updateConversationAfterSending(senderPhone, receiverPhone, aiErr);
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

  const updateConversationAfterSending = async (
    userPhone: string,
    contactPhone: string,
    lastMessage: string
  ) => {
    try {
      const now = new Date().toISOString();
      
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('contact_phone', contactPhone)
        .single();
      
      if (existing) {
        // Update existing conversation
        const { error } = await supabase
          .from('conversations')
          .update({
            last_message: lastMessage,
            last_message_time: now,
            updated_at: now
            // Don't update unread_count for outgoing messages
          })
          .eq('id', existing.id);
          
        if (error) {
          console.error('Error updating conversation:', error);
        } else {
          console.log('✅ Conversation updated successfully');
        }
      } else {
        // Create new conversation
        const { error } = await supabase
          .from('conversations')
          .insert({
            user_phone: userPhone,
            contact_phone: contactPhone,
            contact_name: contactPhone, // You might want to get the actual name from contacts
            last_message: lastMessage,
            last_message_time: now,
            unread_count: 0, // 0 for outgoing messages
          });
          
        if (error) {
          console.error('Error creating conversation:', error);
        } else {
          console.log('✅ New conversation created successfully');
        }
      }
      
    } catch (error) {
      console.error('Error in updateConversationAfterSending:', error);
    }
  };
  
  const handleMultimedia = () => {
    const options = [
      {
        text: "📷 Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Camera access is needed to take photos and videos.");
            return;
          }
          
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
          });
          
          if (!result.canceled) {
            const asset = result.assets[0];
            const fileName = asset.fileName || `camera-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
            const mimeType = asset.type === "video" ? "video/mp4" : "image/jpeg";
            
            try {
              const url = await uploadFileToSupabase(asset.uri, fileName, mimeType);
              await insertMediaMessage(
                url,
                mimeType.includes("video") ? "video" : "image",
                fileName
              );
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading media");
            }
          }
        },
      },
      {
        text: "🖼️ Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Gallery access is needed to select photos and videos.");
            return;
          }
          
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
          });
          
          if (!result.canceled) {
            const asset = result.assets[0];
            const fileName = asset.fileName || `gallery-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
            const mimeType = asset.type === "video" ? "video/mp4" : "image/jpeg";
            
            try {
              const url = await uploadFileToSupabase(asset.uri, fileName, mimeType);
              await insertMediaMessage(
                url,
                mimeType.includes("video") ? "video" : "image",
                fileName
              );
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading media");
            }
          }
        },
      },
      {
        text: "📄 Document",
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
      { text: "❌ Cancel", style: "cancel" as const },
    ];

    Alert.alert("📎 Attach Media", "Choose an option:", options);
  };
  
  const handleToggleReply = (messageText: string) => {
    setReplyToMessage((prev) => (prev === messageText ? null : messageText));
  };

  const openMediaModal = (uri: string, type: 'image' | 'video') => {
    setMediaModal({ visible: true, uri, type });
  };

  const closeMediaModal = () => {
    setMediaModal({ visible: false, uri: '', type: 'image' });
  };

  const renderMediaContent = (item: Message) => {
    if (!item.media_url) return null;
    const isMyMsg = item.sender_phone === senderPhone;

    switch (item.media_type) {
      case 'image':
        return (
          <View style={styles.mediaContainer}>
            <TouchableOpacity onPress={() => openMediaModal(item.media_url!, 'image')}>
              <Image
                source={{ uri: item.media_url }}
                style={styles.imageMessage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        );

      case 'video':
        return (
          <View style={styles.mediaContainer}>
            <TouchableOpacity onPress={() => openMediaModal(item.media_url!, 'video')}>
              <Image
                source={{ uri: item.media_url }}
                style={styles.imageMessage}
                resizeMode="cover"
              />
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶️</Text>
              </View>
            </TouchableOpacity>
          </View>
        );

      case 'document':
        return (
          <TouchableOpacity
            onPress={() => Linking.openURL(item.media_url!)}
            style={[styles.documentContainer, isMyMsg ? styles.myDocument : styles.theirDocument]}
          >
            <View style={styles.documentIcon}>
              <Text style={styles.documentIconText}>📄</Text>
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>
                {item.file_name || 'Document'}
              </Text>
              <Text style={styles.documentSize}>
                {item.file_size ? formatFileSize(item.file_size) : 'Unknown size'}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case "audio":
        const isCurrentlyPlaying = isPlaying[item.id];
        return (
          <TouchableOpacity
            onPress={() => playAudio(item.media_url!, item.id)}
            style={[styles.audioContainer, isMyMsg ? styles.myAudio : styles.theirAudio]}
            disabled={isCurrentlyPlaying}
          >
            <View style={styles.audioIcon}>
              <Text style={styles.audioIconText}>
                {isCurrentlyPlaying ? "⏸️" : "▶️"}
              </Text>
            </View>
            <View style={styles.audioWaveform}>
              <View style={styles.audioWave} />
              <View style={styles.audioWave} />
              <View style={styles.audioWave} />
              <View style={styles.audioWave} />
              <View style={styles.audioWave} />
            </View>
            <Text style={styles.audioDuration}>0:30</Text>
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
      return (
        <View style={[styles.messageWrapper, styles.aiWrapper]}>
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
      <TouchableOpacity 
      onLongPress={() => selectionMode ? null : enterSelectionMode(item.id)}
      onPress={() => selectionMode ? toggleMessageSelection(item.id) : handleToggleReply(item.message)}
      activeOpacity={selectionMode ? 0.7 : 1}
    >
      <View
        style={[
          styles.messageWrapper,
          isMyMsg ? styles.myWrapper : styles.theirWrapper,
          isReplyMsg && styles.replyMsgContainer,
          selectedMessages.has(item.id) && styles.selectedMessage,
        ]}
      >
        {/* Add selection indicator */}
        {selectionMode && (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionCheckmark}>
              {selectedMessages.has(item.id) ? '✓' : '○'}
            </Text>
          </View>
        )}
        
        {/* Rest of your existing message content */}
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
        {/* Header */}
<View style={[styles.header, themeStyles.header]}>
  {selectionMode ? (
    // Selection Mode Header
    <>
      <TouchableOpacity style={styles.backButton} onPress={exitSelectionMode}>
        <Text style={[styles.backButtonText, themeStyles.headerText]}>✕</Text>
      </TouchableOpacity>
      
      <View style={styles.selectionInfo}>
        <Text style={[styles.selectionCount, themeStyles.title]}>
          {selectedMessages.size} selected
        </Text>
      </View>
      
      <View style={styles.selectionActions}>
        <TouchableOpacity style={styles.actionButton} onPress={selectAllMessages}>
          <Text style={styles.actionIcon}>☑️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => {setContactSearch("");loadContacts();setShowForwardModal(true)}}>
          <Text style={styles.actionIcon}>↗️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={deleteSelectedMessages}>
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </>
  ) : (
    // Normal Mode Header
    <>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backButtonText, themeStyles.headerText]}>&lt;</Text>
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={[styles.title, themeStyles.title]}>
          {contactName || receiverPhone}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.menuButton} onPress={() => setShowClearChatModal(true)}>
        <Text style={[styles.menuIcon, themeStyles.headerText]}>⋮</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => setPrivacyMode(!privacyMode)}
        style={[styles.privacyToggleBtn, { backgroundColor: privacyMode ? '#4caf50' : '#d32f2f' }]}
      >
        <Text style={styles.privacyToggleText}>
          {privacyMode ? 'Privacy' : 'Standard'}
        </Text>
      </TouchableOpacity>
    </>
  )}
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
          showsVerticalScrollIndicator={false}
        />

        {/* Reply Banner */}
        {replyToMessage && (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerContent}>
              <Text style={styles.replyBannerLabel}>Replying to:</Text>
              <Text style={styles.replyBannerText} numberOfLines={1}>{replyToMessage}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyToMessage(null)} style={styles.cancelReplyButton}>
              <Text style={styles.cancelReplyText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload Progress */}
        {uploadingMedia && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.uploadingText}>Uploading media...</Text>
          </View>
        )}

        {/* Recording Indicator */}
        {recording && (
          <View style={styles.recordingContainer}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recordingText}>Recording... {formatDuration(recordingDuration)}</Text>
            <Text style={styles.recordingHint}>Release to send</Text>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, themeStyles.inputContainer]}>
          <TouchableOpacity style={styles.mediaButton} onPress={handleMultimedia}>
            <Text style={styles.mediaIcon}>📎</Text>
          </TouchableOpacity>
          
          <TextInput
            placeholder={recording ? "Recording..." : "Type a message or tap 📎 for media..."}
            placeholderTextColor={privacyMode ? '#bbb' : '#999'}
            style={[styles.input, themeStyles.input]}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            multiline
            maxLength={1000}
            editable={!recording}
          />

          {input.trim() ? (
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.micButton, recording && styles.micButtonRecording]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.7}
            >
              <Text style={styles.micButtonText}>🎤</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Media Modal */}
        <Modal visible={mediaModal.visible} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeMediaModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              
              {mediaModal.type === 'image' ? (
                <Image
                  source={{ uri: mediaModal.uri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.modalVideoContainer}>
                  <Text style={styles.modalVideoText}>Video Preview</Text>
                  <Text style={styles.modalVideoHint}>Tap to open in external player</Text>
                  <TouchableOpacity
                    style={styles.modalVideoButton}
                    onPress={() => {
                      Linking.openURL(mediaModal.uri);
                      closeMediaModal();
                    }}
                  >
                    <Text style={styles.modalVideoButtonText}>▶️ Open Video</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
        {/* Forward Modal */}
<Modal visible={showForwardModal} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.forwardModalContent}>
      <View style={styles.forwardHeader}>
        <Text style={styles.forwardTitle}>Forward to</Text>
        <TouchableOpacity onPress={() => setShowForwardModal(false)}>
          <Text style={styles.forwardClose}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={contactSearch}
          onChangeText={setContactSearch}
          autoCapitalize="none"
        />
        {contactSearch.length > 0 && (
          <TouchableOpacity 
            style={styles.clearSearch}
            onPress={() => setContactSearch("")}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.phone}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => forwardMessages(item.phone)}
          >
            <View style={styles.contactAvatar}>
              <Text style={styles.contactInitial}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
            </View>
          </TouchableOpacity>
        )}
        style={styles.contactList}
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>
              {contactSearch ? "No contacts found" : "No contacts available"}
            </Text>
          </View>
        }
      />
    </View>
  </View>
</Modal>

{/* Clear Chat Confirmation Modal */}
<Modal visible={showClearChatModal} transparent animationType="fade">
  <View style={styles.modalContainer}>
    <View style={styles.clearChatModal}>
      <Text style={styles.clearChatTitle}>Clear Chat</Text>
      <Text style={styles.clearChatMessage}>
        This will delete all messages in this chat. This action cannot be undone.
      </Text>
      
      <View style={styles.clearChatActions}>
        <TouchableOpacity
          style={[styles.clearChatButton, styles.cancelButton]}
          onPress={() => setShowClearChatModal(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.clearChatButton, styles.confirmButton]}
          onPress={clearAllChat}
        >
          <Text style={styles.confirmButtonText}>Clear Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Enhanced Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#dcd0a8" },
  container: { flex: 1, paddingHorizontal: 12, backgroundColor: "#dcd0a8" },
  
  header: {
    paddingVertical: 16,
    paddingHorizontal: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",          // Full width
    backgroundColor: "#dcd0a8", // Beige background
    borderBottomWidth: 0.5, // keep or remove depending on look
    borderBottomColor: "#C4B896",
    // ❌ Remove shadows if you don’t want box look
    elevation: 0,
    shadowColor: "transparent",
  },
  
  titleContainer: { flex: 1, alignItems: "center", justifyContent: "center", width:"100%" },
  title: { fontSize: 18, fontFamily: "Kreon-Bold", fontWeight: '600', color: "#000" },
  privacyToggleBtn: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    backgroundColor: "#007AFF", // Keep blue for toggle
  },
  privacyToggleText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  
  messageWrapper: { 
    maxWidth: "85%", 
    padding: 12, 
    marginVertical: 2, 
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myWrapper: { 
    alignSelf: "flex-end", 
    backgroundColor: "#F0E68C", // Warmer khaki color matching theme
    borderBottomRightRadius: 4,
    marginLeft: 50,
  },
  theirWrapper: { 
    alignSelf: "flex-start", 
    backgroundColor: "#F5F5DC", // Beige color matching theme
    borderBottomLeftRadius: 4,
    marginRight: 50,
  },
  myMsg: { fontFamily: "Kreon-Regular", color: "#000", fontSize: 16, lineHeight: 20 },
  theirMsg: { fontFamily: "Kreon-Regular", color: "#000", fontSize: 16, lineHeight: 20 },
  
  botMsg: { 
    backgroundColor: '#E9E9E9', // Match the chats section background
    padding: 12, 
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  botMsgText: { 
    fontFamily: 'Kreon-Regular', 
    fontStyle: 'italic', 
    textAlign: 'center', 
    fontSize: 15, 
    color: '#555' // Darker color for better contrast
  },
  
  timeText: { 
    fontSize: 10, 
    color: "#666", 
    marginTop: 4, 
    alignSelf: "flex-end",
    fontFamily: "Kreon-Regular"
  },
  
  replyMsgContainer: { borderLeftWidth: 3, borderLeftColor: '#007AFF', paddingLeft: 8 },
  replyToContainer: { 
    backgroundColor: '#F0F0F0', // Neutral color matching theme
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderRadius: 8, 
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  replyToText: { color: '#007AFF', fontStyle: 'italic', fontSize: 12, fontFamily: "Kreon-Regular" },
  
  backButton: { 
    width: 44, 
    height: 44, 
    alignItems: "center", 
    justifyContent: "center",
    borderRadius: 22,
  },
  backButtonText: { fontSize: 24, fontFamily: "Kreon-Bold", fontWeight: '600', color: "#000" },
  
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9E9E9', // Match chats background
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  replyBannerContent: { flex: 1, marginRight: 12 },
  replyBannerLabel: { 
    color: '#007AFF', 
    fontSize: 12, 
    fontFamily: "Kreon-Bold", 
    fontWeight: '600',
    marginBottom: 2 
  },
  replyBannerText: { 
    color: '#333', 
    flex: 1, 
    fontFamily: "Kreon-Regular", 
    fontSize: 14 
  },
  cancelReplyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35', // Orange color from chats theme
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReplyText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9E9E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#666',
    fontFamily: "Kreon-Regular",
    fontSize: 14,
  },
  
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E68C', // Warm color matching theme
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35', // Orange from chats theme
    marginRight: 8,
  },
  recordingText: {
    color: '#B8860B', // Dark goldenrod matching warm theme
    fontFamily: "Kreon-Bold",
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  recordingHint: {
    color: '#666',
    fontFamily: "Kreon-Regular",
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: 0.5,
    borderColor: "#C4B896",
    marginBottom: 4,
    gap: 8,
    backgroundColor: "#dcd0a8",
  },
  
  mediaButton: {
    backgroundColor: "#E9E9E9",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mediaIcon: { fontSize: 20, transform: [{ rotate: '45deg' }], color: "#666" },
  
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    fontFamily: "Kreon-Regular",
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'center',
    backgroundColor: "#F5F5DC",
    borderColor: "#C4B896",
    color: "#000",
  },
  
  sendButton: {
    backgroundColor: "#34C759", // Green from chats theme
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  sendButtonText: { 
    fontSize: 20, 
    color: "#fff", 
    fontWeight: "bold" 
  },
  
  micButton: {
    backgroundColor: "#007AFF",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  micButtonRecording: {
    backgroundColor: "#FF6B35", // Orange from chats theme
  },
  micButtonText: { fontSize: 20, color: "#fff" },
  
  aiWrapper: {
    alignSelf: "flex-end",
    backgroundColor: "#F0E68C", // Warm khaki matching theme
    borderBottomRightRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9500", // Orange accent from chats
  },
  aiMsg: {
    fontFamily: "Kreon-Regular",
    color: "#B8860B", // Dark goldenrod for better contrast
    fontSize: 15,
    fontStyle: "italic",
  },

  // Media Styles
  mediaContainer: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  imageMessage: {
    width: Math.min(250, screenWidth * 0.6),
    height: Math.min(250, screenWidth * 0.6),
    borderRadius: 12,
  },
  
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 16, color: 'white' },
  
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
    minWidth: 200,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myDocument: { backgroundColor: '#F0E68C' }, // Warm color matching theme
  theirDocument: { backgroundColor: '#E9E9E9' },
  
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentIconText: { fontSize: 18, color: 'white' },
  
  documentInfo: { flex: 1 },
  documentName: {
    fontFamily: 'Kreon-Bold',
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  documentSize: {
    fontFamily: 'Kreon-Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    marginBottom: 4,
    minWidth: 180,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myAudio: { backgroundColor: '#F0E68C' }, // Warm color matching theme
  theirAudio: { backgroundColor: '#E9E9E9' },
  
  audioIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34C759', // Green from chats theme
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  audioIconText: { fontSize: 14, color: 'white' },
  
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    height: 20,
  },
  audioWave: {
    width: 3,
    height: 12,
    backgroundColor: '#34C759', // Green from chats theme
    marginRight: 2,
    borderRadius: 2,
  },
  
  audioDuration: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Kreon-Regular',
    minWidth: 30,
  },

// Selection Mode Styles
selectionInfo: {
  flex: 1,
  alignItems: 'center',
},
selectionCount: {
  fontSize: 16,
  fontFamily: 'Kreon-Bold',
  color: '#000',
},
selectionActions: {
  flexDirection: 'row',
  gap: 12,
},
actionButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#007AFF',
  alignItems: 'center',
  justifyContent: 'center',
},
actionIcon: {
  fontSize: 18,
  color: 'white',
},

// Message Selection Styles
selectedMessage: {
  backgroundColor: '#E9E9E9', // Match chats background
  borderWidth: 2,
  borderColor: '#007AFF',
},
selectionIndicator: {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: 'white',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 3,
},
selectionCheckmark: {
  fontSize: 14,
  color: '#007AFF',
  fontWeight: 'bold',
},

// Menu Button
menuButton: {
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 22,
},
menuIcon: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#000',
},

// Forward Modal Styles
forwardModalContent: {
  backgroundColor: '#F5F5DC', // Beige matching theme
  width:'100%',
  marginHorizontal: 20,
  borderRadius: 0,
  maxHeight: '100%',
  elevation: 5,
},
forwardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#C4B896',
  backgroundColor: '#dcd0a8',
},
forwardTitle: {
  fontSize: 18,
  fontFamily: 'Kreon-Bold',
  color: '#000',
},
forwardClose: {
  fontSize: 20,
  color: '#666',
},
contactList: {
  maxHeight: 400,
},
contactItem: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#E9E9E9',
},
contactAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#007AFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},
contactInitial: {
  color: 'white',
  fontSize: 16,
  fontFamily: 'Kreon-Bold',
},
contactInfo: {
  flex: 1,
},
contactName: {
  fontSize: 16,
  fontFamily: 'Kreon-Bold',
  color: '#000',
},
contactPhone: {
  fontSize: 14,
  fontFamily: 'Kreon-Regular',
  color: '#666',
},

// Search Styles
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  margin: 16,
  borderWidth: 1,
  borderColor: '#C4B896',
  borderRadius: 8,
  backgroundColor: '#F5F5DC',
},
searchInput: {
  flex: 1,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
  fontFamily: 'Kreon-Regular',
  color: '#000',
},
clearSearch: {
  padding: 10,
},
clearSearchText: {
  fontSize: 16,
  color: '#666',
},
emptySearch: {
  padding: 20,
  alignItems: 'center',
},
emptySearchText: {
  fontSize: 16,
  color: '#666',
  fontFamily: 'Kreon-Regular',
},

// Clear Chat Modal Styles
clearChatModal: {
  backgroundColor: '#F5F5DC', // Beige matching theme
  margin: 20,
  borderRadius: 12,
  padding: 24,
  elevation: 5,
},
clearChatTitle: {
  fontSize: 20,
  fontFamily: 'Kreon-Bold',
  color: '#000',
  marginBottom: 12,
  textAlign: 'center',
},
clearChatMessage: {
  fontSize: 16,
  fontFamily: 'Kreon-Regular',
  color: '#666',
  textAlign: 'center',
  marginBottom: 24,
  lineHeight: 22,
},
clearChatActions: {
  flexDirection: 'row',
  justifyContent: 'space-around',
},
clearChatButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 8,
  marginHorizontal: 8,
},
cancelButton: {
  backgroundColor: '#E9E9E9',
},
confirmButton: {
  backgroundColor: '#FF6B35', // Orange from chats theme
},
cancelButtonText: {
  color: '#000',
  fontSize: 16,
  fontFamily: 'Kreon-Bold',
  textAlign: 'center',
},
confirmButtonText: {
  color: 'white',
  fontSize: 16,
  fontFamily: 'Kreon-Bold',
  textAlign: 'center',
},

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    height:'100%',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    height: '80%',
    backgroundColor: '#F5F5DC', // Beige matching theme
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalVideoText: {
    fontSize: 24,
    fontFamily: 'Kreon-Bold',
    color: '#000',
    marginBottom: 8,
  },
  modalVideoHint: {
    fontSize: 16,
    fontFamily: 'Kreon-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  modalVideoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalVideoButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Kreon-Bold',
    fontWeight: '600',
  },
});

const lightTheme = StyleSheet.create({
  safeArea: { backgroundColor: '#dcd0a8' },
  container: { backgroundColor: '#dcd0a8' },
  header: { backgroundColor: '#dcd0a8' },
  title: { color: '#000' },
  headerText: { color: '#000' },
  inputContainer: { backgroundColor: '#dcd0a8' },
  input: { 
    backgroundColor: '#F5F5DC', 
    color: '#000', 
    borderColor: '#C4B896',
  },
});

const darkTheme = StyleSheet.create({
  safeArea: { backgroundColor: '#2C2416' }, // Dark version of beige
  container: { backgroundColor: '#2C2416' },
  header: { backgroundColor: '#3A301E', borderColor: '#4A3D2A' },
  title: { color: '#FFFFFF' },
  headerText: { color: '#FFFFFF' },
  inputContainer: { backgroundColor: '#2C2416', borderColor: '#4A3D2A' },
  input: { 
    backgroundColor: '#3A301E', 
    color: '#FFFFFF', 
    borderColor: '#4A3D2A',
  },
});