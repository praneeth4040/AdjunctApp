import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase'; // Adjust your path
import { Session, User } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const messageRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.data?.subscription.unsubscribe();
    };
  }, []);

  const senderPhone = session?.user?.phone || '';

  // Fetch existing messages
  useEffect(() => {
    if (!senderPhone) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_phone.eq.${senderPhone},receiver_phone.eq.${senderPhone}`)
        .order('created_at', { ascending: true });

      if (error) console.error('Fetch error:', error);
      else setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel('message-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new;
          if (
            newMessage.sender_phone === senderPhone ||
            newMessage.receiver_phone === senderPhone
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderPhone]);

  const sendMessage = async () => {
    if (!input || !receiverPhone || !senderPhone) return;

    const { error } = await supabase.from('messages').insert({
      sender_phone: senderPhone,
      receiver_phone: receiverPhone,
      message: input,
    });

    if (error) {
      console.error('Send error:', error.message);
    } else {
      setInput('');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Text style={item.sender_phone === senderPhone ? styles.myMsg : styles.theirMsg}>
      {item.message}
    </Text>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Real-time Chat</Text>
      <TextInput
        placeholder="Receiver phone number"
        style={styles.input}
        value={receiverPhone}
        onChangeText={setReceiverPhone}
        keyboardType="phone-pad"
      />
      <FlatList
        ref={messageRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
      <TextInput
        placeholder="Type your message..."
        style={styles.input}
        value={input}
        onChangeText={setInput}
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginVertical: 5,
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    padding: 10,
    margin: 5,
    borderRadius: 8,
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    padding: 10,
    margin: 5,
    borderRadius: 8
  },
});
