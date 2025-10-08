import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getOrCreateKeys, decryptMessage } from '../lib/encrypt';
import { Message } from '../components/chat/MessageBubble';
const db = SQLite.openDatabaseSync("app.db");
import * as SQLite from "expo-sqlite";
import { v4 as uuidv4 } from 'uuid';
export const useMessages = (
  senderPhone: string,
  receiverPhone: string,
  privacyMode: boolean,
  onMessagesRead?: (phone: string) => void
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const activeChatPhone = useRef<string | null>(null);

  const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

  const decryptMessages = useCallback(async (msgs: Message[]) => {
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
  }, [senderPhone, privacyMode]);

  const loadMessages = useCallback(async () => {
    if (!senderPhone || !receiverPhone) return;

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
    setMessages(decrypted);
  }, [senderPhone, receiverPhone, decryptMessages]);

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
      

      // after successful Supabase update or insert
      const safeNow = now ?? new Date().toISOString();
try {
  // Check if local conversation exists
const localExisting = await db.getAllAsync(
  `SELECT * FROM conversations WHERE user_phone = ? AND contact_phone = ?`,
  [userPhone, contactPhone]
);

if (localExisting.length > 0) {
  // Update existing conversation
  await db.runAsync(
    `UPDATE conversations 
       SET last_message = ?, last_message_time = ?, unread_count = ? 
     WHERE user_phone = ? AND contact_phone = ?`,
    [lastMessage, now, 0, userPhone, contactPhone]
  );
  console.log("✅ Local conversation updated");
} else {
  // Insert new conversation
  await db.runAsync(
    `INSERT INTO conversations 
       (id, user_phone, contact_phone, contact_name, last_message, last_message_time, unread_count) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), userPhone, contactPhone, contactPhone, lastMessage, now, 0]
  );
  console.log("✅ Local conversation created");
}

} catch (err) {
  console.error("❌ Error updating local conversation:", err);
}

    } catch (error) {
      console.error('Error in updateConversationAfterSending:', error);
    }
  };

  useEffect(() => {
    activeChatPhone.current = receiverPhone;
    return () => { activeChatPhone.current = null; };
  }, [receiverPhone]);

  useEffect(() => {
    if (!senderPhone || !receiverPhone) return;

    let mounted = true;

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
  }, [senderPhone, receiverPhone, privacyMode, onMessagesRead, loadMessages, decryptMessages]);

  return {
    messages,
    loadMessages,
    markMessagesAsRead,
    updateConversationAfterSending,
  };
};
