import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import CryptoJS from 'crypto-js';

// Keep secret in real app

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // receiver's phone number
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const messageRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const senderPhone = session?.user?.phone ?? '';
  const receiverPhone = id as string;

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
    console.log(msg)
    const bytes = stringToBytes(msg);
  
    const encryptedBytes = bytes.map((b, i) => {
      let x = b;
  
      // Step 1: XOR with secret key byte (cycled)
      x = x ^ SECRET_KEY[i % SECRET_KEY.length];
  
      // Step 2: Rotate left by 3 bits
      x = rotateLeft(x, 3);
  
      // Step 3: Add 7 modulo 256
      x = (x + 7) & 0xff;
  
      // Step 4: XOR with (key byte + 13) modulo 256 (another key variant)
      x = x ^ ((SECRET_KEY[i % SECRET_KEY.length] + 13) & 0xff);
  
      // Step 5: Rotate left by 1 bit
      x = rotateLeft(x, 1);
  
      // Step 6: Multiply by 5 modulo 256 (introduces non-linearity)
      x = (x * 5) & 0xff;
  
      // Step 7: Add i modulo 256 (adds position dependency)
      x = (x + i) & 0xff;
  
      return x;
    });
  
    return btoa(String.fromCharCode(...encryptedBytes));
  }
  
  function decrypt(ciphertext: string): string {
    const bytes = atob(ciphertext).split('').map(c => c.charCodeAt(0));
  
    const decryptedBytes = bytes.map((b, i) => {
      let x = b;
  
      // Step 7 (reverse): Subtract i modulo 256
      x = (x - i + 256) & 0xff;
  
      // Step 6 (reverse): Multiply by modular inverse of 5 mod 256
      // Since 5 * 205 mod 256 = 1, inverse of 5 mod 256 is 205
      x = (x * 205) & 0xff;
  
      // Step 5 (reverse): Rotate right by 1 bit
      x = rotateRight(x, 1);
  
      // Step 4 (reverse): XOR with (key byte + 13) modulo 256
      x = x ^ ((SECRET_KEY[i % SECRET_KEY.length] + 13) & 0xff);
  
      // Step 3 (reverse): Subtract 7 modulo 256
      x = (x - 7 + 256) & 0xff;
  
      // Step 2 (reverse): Rotate right by 3 bits
      x = rotateRight(x, 3);
  
      // Step 1 (reverse): XOR with secret key byte
      x = x ^ SECRET_KEY[i % SECRET_KEY.length];
  
      return x;
    });
  
    return bytesToString(decryptedBytes);
  }
  

  // Fetch + Subscribe to messages
  useEffect(() => {
    if (!senderPhone || !receiverPhone) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_phone.eq.${senderPhone},receiver_phone.eq.${receiverPhone}),and(sender_phone.eq.${receiverPhone},receiver_phone.eq.${senderPhone})`
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fetch error:', error);
      } else {
        if (privacyMode) {
          const decryptedMessages = data.map((msg: any) => ({
            ...msg,
            message: decrypt(msg.message),
          }));
          setMessages(decryptedMessages);
        } else {
          setMessages(data);
        }
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new;
          if (
            (newMessage.sender_phone === senderPhone && newMessage.receiver_phone === receiverPhone) ||
            (newMessage.sender_phone === receiverPhone && newMessage.receiver_phone === senderPhone)
          ) {
            const decryptedMessage = privacyMode
              ? { ...newMessage, message: decrypt(newMessage.message) }
              : newMessage;
            setMessages((prev) => [...prev, decryptedMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderPhone, receiverPhone, privacyMode]);

  // AI call (unchanged)
  const fetchAIResponse = async (query: string) => {
    try {
      const res = await fetch('https://6b0b87a01d4c.ngrok-free.app/ask-ai', {
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
    console.log("this the input message",input)
    if (!input.trim() || !senderPhone || !receiverPhone) return;

    const text = input.trim();
    console.log("text",text)
    const textToStore = privacyMode ? encrypt(text) : text;
    console.log("text to store" ,textToStore)
    const { error } = await supabase.from('messages').insert({
      sender_phone: senderPhone,
      receiver_phone: receiverPhone,
      message: textToStore,
      reply_to_message: replyToMessage,
    });

    if (error) {
      console.error('Send error:', error.message);
      return;
    }

    setInput('');
    setReplyToMessage(null);

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

  const renderItem = ({ item }: { item: any }) => {
    const isMyMsg = item.sender_phone === senderPhone;
    const isBotMsg = item.is_ai;
    const isReplyMsg = !!item.reply_to_message;

    if (isBotMsg) {
      return (
        <View style={{ alignItems: 'center', marginVertical: 6 }}>
          <View style={[styles.botMsg, { maxWidth: '80%' }]}>
            <Text>{item.message}</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity onLongPress={() => handleToggleReply(item.message)}>
        <View
          style={[
            isMyMsg ? styles.myMsg : styles.theirMsg,
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
          <Text>{item.message}</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.title, themeStyles.title]}>Chat with {receiverPhone}</Text>
          <TouchableOpacity
            onPress={() => setPrivacyMode(!privacyMode)}
            style={[
              styles.privacyToggleBtn,
              { backgroundColor: privacyMode ? '#4caf50' : '#d32f2f' },
            ]}
          >
            <Text style={styles.privacyToggleText}>
              {privacyMode ? 'Privacy ON' : 'Compactability'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={messageRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={{ flexGrow: 1 }}
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
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  privacyToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  privacyToggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Kreon-Bold',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    fontFamily: 'Kreon-Regular',
    borderColor: '#aaa',
    color: '#000',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#b2ffe2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Kreon-Bold',
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    padding: 10,
    marginVertical: 4,
    borderRadius: 12,
    maxWidth: '75%',
    fontFamily: 'Kreon-Regular',
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    padding: 10,
    marginVertical: 4,
    borderRadius: 12,
    maxWidth: '75%',
    fontFamily: 'Kreon-Regular',
  },
  botMsg: {
    backgroundColor: '#FFE7C2',
    padding: 10,
    borderRadius: 12,
    fontFamily: 'Kreon-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#000',
    maxWidth: '75%',
  },
  replyMsgContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
    paddingLeft: 8,
    marginVertical: 4,
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
  },
  cancelReplyText: {
    color: 'red',
    marginLeft: 12,
    fontWeight: 'bold',
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
    borderColor: '#aaa',
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

// Merge base styles and theme styles together
const styles = baseStyles;
