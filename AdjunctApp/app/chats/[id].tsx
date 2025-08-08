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
        scrollToBottom();
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
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [senderPhone, receiverPhone]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messageRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

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
      scrollToBottom();
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View
      style={[
        styles.messageWrapper,
        item.sender_phone === senderPhone ? styles.myWrapper : styles.theirWrapper,
      ]}
    >
      <Text
        style={item.sender_phone === senderPhone ? styles.myMsg : styles.theirMsg}
      >
        {item.message}
      </Text>
      <Text style={styles.timeText}>
        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Chat with {receiverPhone}</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={messageRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 8 }}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type your message..."
            placeholderTextColor="#5c5340"
            style={styles.input}
            value={input}
            onChangeText={setInput}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#DCD0A8',
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: '#DCD0A8',
  },
  header: {
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#c1b590',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  messageWrapper: {
    maxWidth: '75%',
    padding: 8,
    marginVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  myWrapper: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  theirWrapper: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    borderBottomLeftRadius: 4,
  },
  myMsg: {
    fontFamily: 'Kreon-Regular',
    color: '#000',
    fontSize: 16,
  },
  theirMsg: {
    fontFamily: 'Kreon-Regular',
    color: '#000',
    fontSize: 16,
  },
  timeText: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    padding: 4,
    backgroundColor: '#DCD0A8',
    borderTopWidth: 1,
    borderColor: '#c1b590',
    marginBottom:8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    fontFamily: 'Kreon-Regular',
    backgroundColor: '#fff',
    borderColor: '#aaa',
    color: '#000',
  },
  button: {
    backgroundColor: '#b2ffe2',
    width: 45,
    height: 45,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
});
