import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useLocalSearchParams } from 'expo-router';

const Home: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const { userPhone } = useLocalSearchParams();
  const senderPhone = typeof userPhone === 'string' ? userPhone : '';

  const fetchMessages = async () => {
    if (!senderPhone) {
      console.warn('Sender phone not available');
      return;
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_phone.eq.${senderPhone},receiver_phone.eq.${senderPhone}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch error:', error.message);
    } else {
      setMessages(data || []);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !receiverPhone || !senderPhone) {
      Alert.alert('Missing Info', 'Make sure to enter a message and receiver phone number.');
      return;
    }

    const { error } = await supabase.from('messages').insert([
      {
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
        message: input.trim(),
      },
    ]);

    if (error) {
      console.error('Send error:', error.message);
    } else {
      setInput('');
    }
  };

  const subscribeToMessages = () => {
    if (!senderPhone) return;

    const channel = supabase
      .channel(`messages:${senderPhone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_phone=eq.${senderPhone}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    fetchMessages();
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: '#fff',
    },
    header: {
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 10,
    },
    receiverInput: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
    },
    chatBody: {
      flex: 1,
      marginBottom: 10,
    },
    chatMessage: {
      padding: 10,
      marginVertical: 4,
      borderRadius: 8,
      maxWidth: '80%',
    },
    sent: {
      alignSelf: 'flex-end',
      backgroundColor: '#DCF8C6',
    },
    received: {
      alignSelf: 'flex-start',
      backgroundColor: '#E5E5EA',
    },
    msgText: {
      fontSize: 16,
    },
    msgMeta: {
      fontSize: 12,
      color: '#555',
      marginTop: 4,
      textAlign: 'right',
    },
    chatInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chatInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#aaa',
      borderRadius: 8,
      padding: 10,
      marginRight: 8,
    },
  });
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.header}>📱 Chat with User</Text>

      <TextInput
        style={styles.receiverInput}
        placeholder="Receiver phone (e.g. 91234...)"
        value={receiverPhone}
        onChangeText={setReceiverPhone}
        keyboardType="phone-pad"
      />

      <ScrollView
        style={styles.chatBody}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.chatMessage,
              msg.sender_phone === senderPhone ? styles.sent : styles.received,
            ]}
          >
            <Text style={styles.msgText}>{msg.message}</Text>
            <Text style={styles.msgMeta}>
              {new Date(msg.created_at).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Type your message..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
};

export default Home;
