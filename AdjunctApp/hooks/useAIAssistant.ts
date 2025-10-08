import { useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';

export const useAIAssistant = (
  senderPhone: string,
  receiverPhone: string,
  updateConversationAfterSending: (userPhone: string, contactPhone: string, lastMessage: string) => void
) => {
  const handleAI = useCallback(async (query: string): Promise<string> => {
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
  }, [senderPhone, receiverPhone, updateConversationAfterSending]);

  const handleAICommand = useCallback(async (
    query: string,
    insertedMessageId: string,
    updateConversationAfterSending: (userPhone: string, contactPhone: string, lastMessage: string) => void
  ) => {
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
        reply_to_message: insertedMessageId,
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
        reply_to_message: insertedMessageId,
        mode: "compatibility",
        is_read: false,
      });
      await updateConversationAfterSending(senderPhone, receiverPhone, aiErr);
    }
  }, [senderPhone, receiverPhone]);

  return {
    handleAI,
    handleAICommand,
  };
};
