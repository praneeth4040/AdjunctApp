import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchLocal, insertLocal } from '../library/database';
import { Conversation } from '../components/chats/ChatItem';

interface SupabaseMessage {
  id: string | number;
  sender_phone: string;
  receiver_phone: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchConversations = async (
    currentUserPhone: string,
    contactsMap: Record<string, string>
  ) => {
    try {
      console.log('Fetching conversations from local database...');
      const startTime = performance.now();
      
      // Get conversations from local SQLite first
      const localConversations = await fetchLocal('conversations');
      const userConversations = localConversations
        .filter(conv => conv.user_phone === currentUserPhone)
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
      
      if (userConversations.length > 0) {
        const result: Conversation[] = userConversations.map(conv => ({
          id: conv.id,
          phoneNumber: conv.contact_phone,
          name: contactsMap[conv.contact_phone] || conv.contact_name || conv.contact_phone,
          profileImage: conv.profile_picture || "",
          lastMessage: conv.last_message,
          time: new Date(conv.last_message_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unreadCount: conv.unread_count || 0,
          status: ["active", "semiactive", "offline"][Math.floor(Math.random() * 3)] as "active" | "semiactive" | "offline",
        }));
        
        setConversations(result);
        const endTime = performance.now();
        console.log(`Conversations loaded from local DB in ${endTime - startTime}ms`);
        return;
      }
      
      // Fallback to Supabase if local is empty
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_phone', currentUserPhone)
        .order('last_message_time', { ascending: false });
      
      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }
      
      // Store in local DB for next time
      for (const conv of conversations || []) {
        await insertLocal('conversations', {
          id: conv.id,
          user_phone: conv.user_phone,
          contact_phone: conv.contact_phone,
          contact_name: conv.contact_name,
          last_message: conv.last_message,
          last_message_time: conv.last_message_time,
          unread_count: conv.unread_count || 0,
          profile_picture: conv.profile_picture || "",
          created_at: conv.created_at || new Date().toISOString(),
          updated_at: conv.updated_at || new Date().toISOString()
        });
      }
      
      const result: Conversation[] = (conversations || []).map(conv => ({
        id: conv.id,
        phoneNumber: conv.contact_phone,
        name: contactsMap[conv.contact_phone] || conv.contact_name || conv.contact_phone,
        profileImage: conv.profile_picture || "",
        lastMessage: conv.last_message,
        time: conv.last_message_time
          ? new Date(conv.last_message_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        unreadCount: conv.unread_count || 0,
        status: ["active", "semiactive", "offline"][Math.floor(Math.random() * 3)] as "active" | "semiactive" | "offline",
      }));
  
      const endTime = performance.now();
      console.log(`Conversations loaded in ${endTime - startTime}ms`);
      
      setConversations(result);
      
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const updateConversation = async (
    userPhone: string,
    contactPhone: string,
    lastMessage: string,
    contactsMap: Record<string, string>,
    isIncomingMessage: boolean = false
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
            unread_count: isIncomingMessage 
              ? (existing.unread_count || 0) + 1 
              : existing.unread_count,
            updated_at: now
          })
          .eq('id', existing.id);
          
        if (error) console.error('Error updating conversation:', error);
      } else {
        // Create new conversation
        const { error } = await supabase
          .from('conversations')
          .insert({
            user_phone: userPhone,
            contact_phone: contactPhone,
            contact_name: contactsMap[contactPhone] || contactPhone,
            last_message: lastMessage,
            last_message_time: now,
            unread_count: isIncomingMessage ? 1 : 0,
          });
          
        if (error) console.error('Error creating conversation:', error);
      }
      
      // Refresh conversations list
      await fetchConversations(userPhone, contactsMap);
      
    } catch (error) {
      console.error('Error in updateConversation:', error);
    }
  };

  const markMessagesAsRead = async (partnerPhone: string, userPhone: string) => {
    // Update UI immediately
    setConversations((prev) =>
      prev.map((c) =>
        c.phoneNumber === partnerPhone
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  
    try {
      // Update conversations table - reset unread count
      const { error: convError } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('user_phone', userPhone)
        .eq('contact_phone', partnerPhone);
        
      if (convError) console.error('Error updating conversation unread:', convError);
      
      // Update messages table
      const { error: msgError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_phone', partnerPhone)
        .eq('receiver_phone', userPhone)
        .eq('is_read', false);
        
      if (msgError) console.error('Error marking messages as read:', msgError);
  
      // Also update local SQLite
      const allMessages = await fetchLocal('messages');
      const unreadMessages = allMessages.filter(msg =>
        msg.sender_phone === partnerPhone &&
        msg.receiver_phone === userPhone &&
        msg.is_read === 0
      );
  
      for (const message of unreadMessages) {
        await insertLocal('messages', {
          ...message,
          is_read: 1,
        });
      }
  
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const subscribeToMessages = useCallback((currentUserPhone: string) => {
    // Clear existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }
  
    const channel = supabase.channel("messages-realtime");
  
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const newMsg = payload.new as SupabaseMessage;
        
        // Only handle incoming messages (not sent by current user)
        if (newMsg.receiver_phone === currentUserPhone) {
          console.log('📨 New incoming message received');
          
          // Add a small delay and refresh to make sure
          setTimeout(() => {
            // This would need access to contactsMap, so we'll handle it in the main component
          }, 500);
        }
      }
    );
  
    channel.subscribe();
    subscriptionRef.current = channel;
  }, []);

  const cleanup = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }
  };

  return {
    conversations,
    fetchConversations,
    updateConversation,
    markMessagesAsRead,
    subscribeToMessages,
    cleanup,
  };
};
