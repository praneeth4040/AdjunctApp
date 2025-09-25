// chatUtils.ts
import { Alert } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";
import { getOrCreateKeys, encryptMessage, decryptMessage } from "../lib/encrypt";
import axios from 'axios';

export type Message = {
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
  media_type?: "image" | "video" | "document" | "audio";
  file_name?: string;
  file_size?: number;
};

export const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export const getUserMode = async (phone: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("usersmodes")
      .select("mode")
      .eq("phone", phone)
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

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const uploadFileToSupabase = async (uri: string, fileName: string, mimeType: string) => {
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
  } catch (error) {
    throw error;
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

export const startRecording = async (
  setRecording: (recording: Audio.Recording | null) => void,
  setRecordingDuration: (duration: number) => void,
  startPulseAnimation: () => void,
  recordingTimer: React.MutableRefObject<number | null>
) => {
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

export const stopRecording = async (
  recording: Audio.Recording | null,
  stopPulseAnimation: () => void,
  recordingTimer: React.MutableRefObject<number | null>,
  setRecording: (recording: Audio.Recording | null) => void,
  setRecordingDuration: (duration: number) => void,
  insertMediaMessage: (url: string, type: "audio", fileName: string) => Promise<void>
) => {
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

export const playAudio = async (
  uri: string,
  messageId: string,
  setIsPlaying: (callback: (prev: {[key: string]: boolean}) => {[key: string]: boolean}) => void
) => {
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

export const insertMediaMessage = async (
  media_url: string,
  media_type: "image" | "video" | "document" | "audio",
  file_name: string | undefined,
  senderPhone: string,
  receiverPhone: string,
  privacyMode: boolean
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

export const handleAI = async (
  query: string,
  senderPhone: string,
  receiverPhone: string,
  updateConversationAfterSending: (sender: string, receiver: string, message: string) => Promise<void>
): Promise<string> => {
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

export const sendMessage = async (
  input: string,
  senderPhone: string,
  receiverPhone: string,
  privacyMode: boolean,
  replyToMessage: string | null,
  setInput: (input: string) => void,
  setReplyToMessage: (message: string | null) => void,
  scrollToBottom: () => void,
  updateConversationAfterSending: (sender: string, receiver: string, message: string) => Promise<void>
) => {
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
        await updateConversationAfterSending(senderPhone, receiverPhone, "⚠️ AI could not respond right now.");
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

export const updateConversationAfterSending = async (
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

export const loadContacts = async (
  senderPhone: string,
  setContacts: (contacts: {phone: string, name: string}[]) => void
) => {
  try {
    console.log("Loading contacts for sender:", senderPhone);
    
    const { data, error } = await supabase
      .from("profiles")
      .select("phone_number, name")
      .neq("phone_number", senderPhone);
    
    console.log("Supabase response:", { data, error });
    
    if (error) throw error;
    
    const contactList = (data || []).map(profile => ({
      phone: profile.phone_number,
      name: profile.name || profile.phone_number
    }));
    
    console.log("Final contacts:", contactList);
    setContacts(contactList);
  } catch (err) {
    console.error("Load contacts error:", err);
  }
};

export const deleteSelectedMessages = async (
  selectedMessages: Set<string>,
  setMessages: (callback: (prev: Message[]) => Message[]) => void,
  exitSelectionMode: () => void
) => {
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

export const clearAllChat = async (
  senderPhone: string,
  receiverPhone: string,
  setMessages: (messages: Message[]) => void,
  setShowClearChatModal: (show: boolean) => void
) => {
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

export const forwardMessages = async (
  targetPhone: string,
  messages: Message[],
  selectedMessages: Set<string>,
  senderPhone: string,
  privacyMode: boolean,
  setShowForwardModal: (show: boolean) => void,
  exitSelectionMode: () => void
) => {
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

export const decryptMessages = async (msgs: Message[], senderPhone: string, privacyMode: boolean) => {
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