import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export const useMessageSelection = (messages: any[]) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const toggleMessageSelection = useCallback((messageId: string) => {
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
  }, []);

  const enterSelectionMode = useCallback((messageId: string) => {
    setSelectionMode(true);
    setSelectedMessages(new Set([messageId]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  const selectAllMessages = useCallback(() => {
    const allMessageIds = new Set(messages.map(msg => msg.id));
    setSelectedMessages(allMessageIds);
  }, [messages]);

  const deleteSelectedMessages = useCallback(async () => {
    try {
      const messageIds = Array.from(selectedMessages);
      
      const { error } = await supabase
        .from("messages")
        .delete()
        .in('id', messageIds);
      
      if (error) throw error;
      
      exitSelectionMode();
      Alert.alert("Success", `${messageIds.length} message(s) deleted`);
      return true;
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete messages");
      return false;
    }
  }, [selectedMessages, exitSelectionMode]);

  const forwardMessages = useCallback(async (targetPhone: string, senderPhone: string) => {
    try {
      const messagesToForward = messages.filter(msg => selectedMessages.has(msg.id));
      
      for (const msg of messagesToForward) {
        let messageContent = msg.message;
        let mediaUrl = msg.media_url;
        
        // Handle encrypted messages - forward as compatibility mode
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
      
      exitSelectionMode();
      Alert.alert("Success", `${messagesToForward.length} message(s) forwarded`);
      return true;
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to forward messages");
      return false;
    }
  }, [messages, selectedMessages, exitSelectionMode]);

  const clearAllChat = useCallback(async (senderPhone: string, receiverPhone: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .or(`and(sender_phone.eq.${senderPhone},receiver_phone.eq.${receiverPhone}),and(sender_phone.eq.${receiverPhone},receiver_phone.eq.${senderPhone})`);
      
      if (error) throw error;
      
      Alert.alert("Success", "Chat cleared successfully");
      return true;
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to clear chat");
      return false;
    }
  }, []);

  return {
    selectionMode,
    selectedMessages,
    toggleMessageSelection,
    enterSelectionMode,
    exitSelectionMode,
    selectAllMessages,
    deleteSelectedMessages,
    forwardMessages,
    clearAllChat,
  };
};
