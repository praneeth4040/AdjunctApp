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

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // receiver's phone number
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <Text style={styles.title}>Chat with {receiverPhone}</Text>

        <FlatList
          ref={messageRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={{ flexGrow: 1 }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type your message..."
            placeholderTextColor="#5c5340"
            style={styles.input}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#DCD0A8',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#DCD0A8',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    color: '#000',
    marginVertical: 10,
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
    backgroundColor: '#fff',
    borderColor: '#aaa',
    color: '#000',
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
});