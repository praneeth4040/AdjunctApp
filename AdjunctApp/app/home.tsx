import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase'

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // receiver's phone number
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messageRef = useRef<FlatList<any>>(null);

  // Auth Session listener
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

  // Fetch and listen to messages
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
        setMessages(data);
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
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderPhone, receiverPhone]);

  const sendMessage = async () => {
    if (!input.trim() || !senderPhone || !receiverPhone) return;

    const { error } = await supabase.from('messages').insert({
      sender_phone: senderPhone,
      receiver_phone: receiverPhone,
      message: input.trim(),
    });

    if (error) {
      console.error('Send error:', error.message);
    } else {
      setInput('');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Text
      style={item.sender_phone === senderPhone ? styles.myMsg : styles.theirMsg}
    >
      {item.message}
    </Text>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>Chat with {receiverPhone}</Text>
      <FlatList
        ref={messageRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <TextInput
        placeholder="Type your message..."
        style={styles.input}
        value={input}
        onChangeText={setInput}
      />
      <Button title="Send" onPress={sendMessage} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginVertical: 10,
    borderColor: '#ccc',
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: '80%',
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: '80%',
  },
});
