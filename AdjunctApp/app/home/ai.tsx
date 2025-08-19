import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../../lib/supabase';
import axios from 'axios';

// Simple icons
const BotIcon = () => <Text style={styles.iconText}>🤖</Text>;
const UserIcon = () => <Text style={styles.iconText}>👤</Text>;
const SendIcon = () => <Text style={styles.iconText}>➤</Text>;
const ChatIcon = () => <Text style={styles.iconText}>💬</Text>;
const ClockIcon = () => <Text style={styles.iconText}>🕒</Text>;

interface Message {
  id: number;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
}

interface ActionPair {
  id: number;
  userText: string;
  aiText: string | null;
  createdAt: string;
}

const AIMessagingApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'recent'>('chat');
  const [recentActions, setRecentActions] = useState<ActionPair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchUserPhone();
  }, []);

  useEffect(() => {
    if (userPhone) {
      fetchMessages();
      fetchRecentActions();
    }
  }, [userPhone]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = (): void => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const fetchUserPhone = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error fetching user:', error.message);
      return;
    }

    const phone = data.user?.phone;
    if (phone) {
      setUserPhone(phone);
    }
  };
  const insertMessage = async (
    text: string,
    sender: 'user' | 'ai'
  ) => {
    const { error } = await supabase.from('chatbotmessages').insert({
      text,
      sender_phone: userPhone,
      is_ai: sender === 'ai',
    });
  
    if (error) {
      console.error('Insert error:', error.message);
    }
  };
  
  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim() || !userPhone) return;
  
    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
  
    setMessages(prev => [...prev, userMessage]);
    scrollToBottom();
    setInputText('');
  
    await insertMessage(inputText, 'user');
  
    try {
      const response = await axios.post(
        'https://a10200a1987b.ngrok-free.app/ask-ai',
        {
          query: inputText,
          sender_phone: userPhone,
          receiver_phone: 'ai',
        }
      );
  
      const aiText = response.data.reply || 'No AI response received.';
  
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: aiText,
        sender: 'ai',
        timestamp: new Date()
      };
  
      setMessages(prev => [...prev, aiMessage]);
      scrollToBottom();
  
      await insertMessage(aiText, 'ai');
    } catch (error) {
      console.error('Sending error:', error);
      const errorMessage: Message = {
        id: Date.now() + 2,
        text: 'Error getting AI response.',
        sender: 'ai',
        timestamp: new Date()
      };
  
      setMessages(prev => [...prev, errorMessage]);
    }
  };
  

  const fetchMessages = async () => {
    if (!userPhone) return;
  
    const { data, error } = await supabase
      .from('chatbotmessages')
      .select('*')
      .eq('sender_phone', userPhone)
      .order('created_at', { ascending: true });
  
    if (error) {
      console.error('Fetch messages error:', error.message);
      return;
    }
  
    if (data) {
      const formatted = data
      .filter(msg => msg.created_at && msg.text !== undefined)
      .map(msg => {
        const createdAt = new Date(msg.created_at);
        return {
          id: createdAt.getTime() || Date.now(),
          text: msg.text,
          sender: (msg.is_ai ? 'ai' : 'user') as 'ai' | 'user',
          timestamp: createdAt
        };
      });
    
          ;
  
      setMessages(formatted);
    }
  };
  

  const fetchRecentActions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_phone', userPhone)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(error.message);
      setLoading(false);
      return;
    }

    const pairs: ActionPair[] = [];
    let lastUserMessage: any = null;

    data.reverse().forEach((msg) => {
      if (!msg.is_ai) {
        lastUserMessage = msg;
      } else if (msg.is_ai && lastUserMessage) {
        pairs.push({
          id: msg.id,
          userText: lastUserMessage.text,
          aiText: msg.text,
          createdAt: msg.created_at,
        });
        lastUserMessage = null;
      }
    });

    setRecentActions(pairs.reverse());
    setLoading(false);
  };
  
  const formatTime = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <ChatIcon />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <ClockIcon />
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
            Recent Actions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {activeTab === 'chat' ? (
          <View style={styles.chatContainer}>
            {/* Messages */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    message.sender === 'user' && styles.userMessageRow
                  ]}
                >
                  <View style={[
                    styles.messageAvatar,
                    message.sender === 'ai' ? styles.aiAvatar : styles.userAvatar
                  ]}>
                    {message.sender === 'ai' ? <BotIcon /> : <UserIcon />}
                  </View>
                  <View style={styles.messageContent}>
                    <View style={[
                      styles.messageBubble,
                      message.sender === 'ai' ? styles.aiMessage : styles.userMessage
                    ]}>
                      <Text style={[
                        styles.messageText,
                        message.sender === 'user' && styles.userMessageText
                      ]}>
                        {message.text}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <SendIcon />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Recent AI Actions</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#DCD0A8" />
            ) : recentActions.length > 0 ? (
              recentActions.map((action) => (
                <View key={action.id} style={styles.actionItem}>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionText}>
                      For this: {action.userText}
                    </Text>
                    <Text style={styles.aiReplyText}>
                      I replied: {action.aiText}
                    </Text>
                    <Text style={styles.actionTime}>
                      {formatTime(action.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', color: '#6B7280' }}>
                No recent actions found.
              </Text>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 40,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#DCD0A8',
  },
  tabText: { marginLeft: 8, fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#1F2937', fontWeight: '600' },
  content: { flex: 1 },
  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16 },
  messageRow: { flexDirection: 'row', marginBottom: 16 },
  userMessageRow: { flexDirection: 'row-reverse' },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  aiAvatar: { backgroundColor: '#DCD0A8' },
  userAvatar: { backgroundColor: '#374151' },
  messageContent: { maxWidth: '80%' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  aiMessage: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  userMessage: { backgroundColor: '#DCD0A8' },
  messageText: { fontSize: 14, color: '#1F2937' },
  userMessageText: { color: '#374151' },
  messageTime: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  inputContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 12, backgroundColor: '#F9FAFB' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, padding: 12, fontSize: 16 },
  sendButton: { marginLeft: 8, width: 48, height: 48, backgroundColor: '#DCD0A8', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  recentContainer: { flex: 1, padding: 16 },
  recentTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  actionItem: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, marginBottom: 12 },
  actionContent: { flex: 1 },
  actionText: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  aiReplyText: { fontSize: 15, color: '#374151', marginBottom: 4 },
  actionTime: { fontSize: 12, color: '#6B7280' },
  iconText: { fontSize: 16 },
});

export default AIMessagingApp;
