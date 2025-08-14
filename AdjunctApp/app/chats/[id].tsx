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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import * as Contacts from "expo-contacts";

type Message = {
  id: string;
  sender_phone: string;
  receiver_phone: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export default function ChatScreen({
  onMessagesRead,
}: {
  onMessagesRead?: (phone: string) => void;
}) {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [contactName, setContactName] = useState<string>("");
  const [loadingContact, setLoadingContact] = useState<boolean>(true);

  const messageRef = useRef<FlatList<Message>>(null);
  const activeChatPhone = useRef<string | null>(null);

  const receiverPhone = normalizePhone((id as string) || "");
  const senderPhone = session?.user?.phone
    ? normalizePhone(session.user.phone)
    : "";

  // Track open chat
  useEffect(() => {
    activeChatPhone.current = receiverPhone;
    return () => {
      activeChatPhone.current = null;
    };
  }, [receiverPhone]);

  // Load contact name when receiver phone is available
  useEffect(() => {
    if (receiverPhone) {
      loadContactName(receiverPhone);
    }
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
      setMessages(data as Message[]);
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
            setMessages((prev) => [...prev, newMsg]);
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
  }, [senderPhone, receiverPhone]);

  // Focus: mark read
  useFocusEffect(
    useCallback(() => {
      if (senderPhone && receiverPhone) {
        markMessagesAsRead();
      }
    }, [senderPhone, receiverPhone])
  );

  // Keyboard listener to scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Scroll to show recent messages near keyboard on both platforms
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Scroll to bottom when keyboard is dismissed
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const loadContactName = async (phoneNumber: string) => {
    setLoadingContact(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setContactName(phoneNumber);
        setLoadingContact(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      for (const contact of data) {
        if (contact.phoneNumbers) {
          for (const phone of contact.phoneNumbers) {
            const cleanPhone = normalizePhone(phone.number || "");
            if (cleanPhone === phoneNumber) {
              setContactName(contact.name || phoneNumber);
              setLoadingContact(false);
              return;
            }
          }
        }
      }
      
      // If no contact found, use the phone number
      setContactName(phoneNumber);
      setLoadingContact(false);
    } catch (error) {
      console.error("Error loading contact:", error);
      setContactName(phoneNumber);
      setLoadingContact(false);
    }
  };

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
      .select(); // ensures `data` is an array

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

  const sendMessage = async () => {
    if (!input.trim() || !senderPhone || !receiverPhone) return;

    const { error } = await supabase.from("messages").insert({
      sender_phone: senderPhone,
      receiver_phone: receiverPhone,
      message: input.trim(),
      is_read: false,
    });

    if (error) {
      console.error("Send error:", error.message);
      return;
    }

    setInput("");
    scrollToBottom();
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageWrapper,
        item.sender_phone === senderPhone
          ? styles.myWrapper
          : styles.theirWrapper,
      ]}
    >
      <Text
        style={
          item.sender_phone === senderPhone ? styles.myMsg : styles.theirMsg
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
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
             <KeyboardAvoidingView
         style={styles.container}
         behavior={Platform.OS === "ios" ? "padding" : "height"}
         keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
         enabled={true}
       >
        <View style={styles.header}>
                     <TouchableOpacity 
             style={styles.backButton} 
             onPress={() => router.back()}
           >
             <Text style={styles.backButtonText}>&lt;</Text>
           </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {contactName || receiverPhone}
            </Text>
          </View>
        </View>
                 <FlatList
           ref={messageRef}
           data={messages}
           renderItem={renderItem}
           keyExtractor={(item) => item.id}
           contentContainerStyle={{
             flexGrow: 1,
             paddingVertical: 8,
           }}
           showsVerticalScrollIndicator={false}
           automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
           maintainVisibleContentPosition={{
             minIndexForVisible: 0,
             autoscrollToTopThreshold: 10,
           }}
         />

                 <View style={styles.inputContainer}>
           <TextInput
             placeholder="Type your message..."
             placeholderTextColor="#5c5340"
             style={styles.input}
             value={input}
             onChangeText={setInput}
             multiline={false}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#DCD0A8" },
  container: { flex: 1, paddingHorizontal: 12, backgroundColor: "#DCD0A8" },
  header: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#c1b590",
    position: "relative",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: "Kreon-Bold", color: "#000" },
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
  myMsg: { fontFamily: "Kreon-Regular", color: "#000", fontSize: 16 },
  theirMsg: { fontFamily: "Kreon-Regular", color: "#000", fontSize: 16 },
  timeText: {
    fontSize: 10,
    color: "#555",
    marginTop: 2,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#DCD0A8",
    borderTopWidth: 1,
    borderColor: "#c1b590",
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    fontFamily: "Kreon-Regular",
    backgroundColor: "#fff",
    borderColor: "#aaa",
    color: "#000",
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
  buttonText: { fontSize: 18, color: "#000", fontWeight: "bold" },
  backButton: {
    position: "absolute",
    left: 0,
    top: 10,
    width: 44,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
    fontFamily: "Kreon-Bold",
  },
});
