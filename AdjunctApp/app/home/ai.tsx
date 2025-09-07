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
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive helper functions
const wp = (percentage: number): number => (screenWidth * percentage) / 100;
const hp = (percentage: number): number => (screenHeight * percentage) / 100;

// Font scaling based on screen width
const getFontSize = (size: number): number => {
  const scale = screenWidth / 375; // Base width (iPhone X/11/12/13 width)
  const newSize = size * scale;
  return Math.max(10, Math.min(newSize, size * 1.2)); // Min 10, max 20% larger than original
};

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
  const insets = useSafeAreaInsets();

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
  
  const getChatHistoryForContext = async (): Promise<
    { role: 'user' | 'assistant'; content: string }[]
  > => {
    if (!userPhone) return [];

    const { data, error } = await supabase
      .from('chatbotmessages')
      .select('text, is_ai, created_at')
      .eq('sender_phone', userPhone)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching chat history:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((msg) => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.text,
    }));
  };

  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim() || !userPhone) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    scrollToBottom();
    setInputText('');

    await insertMessage(inputText, 'user');

    try {
      const history = await getChatHistoryForContext();
      const historyString = history
        .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
        .join('\n');

      const finalMessage = `${historyString}\nUser: ${inputText}`;

      const response = await axios.post(
        'https://f817258401b2.ngrok-free.app/ask-ai',
        {
          query: finalMessage,
          sender_phone: userPhone,
          receiver_phone: 'ai',
        }
      );

      const aiText = response.data.reply || 'No AI response received.';

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: aiText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      scrollToBottom();

      await insertMessage(aiText, 'ai');
    } catch (error) {
      console.error('Sending error:', error);
      const errorMessage: Message = {
        id: Date.now() + 2,
        text: 'Error getting AI response.',
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
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
  
      setMessages(formatted);
    }
  };

  const fetchRecentActions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_phone.eq.${userPhone},is_ai.eq.true`)
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
          userText: lastUserMessage.message,
          aiText: msg.message,
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
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Adjunct</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
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
              onContentSizeChange={() => scrollToBottom()}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    Start a conversation with AI
                  </Text>
                  <Text style={styles.emptyStateSubText}>
                    Ask anything and get intelligent responses
                  </Text>
                </View>
              ) : (
                messages.map((message) => (
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
                      <Text style={[
                        styles.avatarText,
                        message.sender === 'ai' ? styles.aiAvatarText : styles.userAvatarText
                      ]}>
                        {message.sender === 'ai' ? 'AI' : 'U'}
                      </Text>
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
                      <Text style={[
                        styles.messageTime,
                        message.sender === 'user' && styles.userMessageTime
                      ]}>
                        {formatTime(message.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  placeholderTextColor="#6f634f"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!inputText.trim()}
                >
                  <Text style={styles.sendButtonText}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.recentContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.recentTitle}>Recent AI Actions</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6f634f" />
                  <Text style={styles.loadingText}>Loading recent actions...</Text>
                </View>
              ) : recentActions.length > 0 ? (
                recentActions.map((action) => (
                  <View key={action.id} style={styles.actionItem}>
                    <View style={styles.actionHeader}>
                      <Text style={styles.actionLabel}>Your Question:</Text>
                      <Text style={styles.actionTime}>
                        {formatTime(action.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.actionText}>
                      {action.userText}
                    </Text>
                    <Text style={styles.actionLabel}>AI Response:</Text>
                    <Text style={styles.aiReplyText}>
                      {action.aiText || 'No response available'}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    No recent actions found
                  </Text>
                  <Text style={styles.emptyStateSubText}>
                    Start chatting to see your conversation history
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Bottom Indicator */}
      <View style={styles.bottomIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#dcd0a8',
    paddingHorizontal: wp(5),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(2),
    paddingTop: hp(1),
  },
  title: {
    fontSize: getFontSize(24),
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1dea9',
    borderRadius: 15,
    marginBottom: hp(2),
    padding: wp(1),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#b2ffe2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: getFontSize(16),
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
  },
  activeTabText: {
    color: '#000',
    fontFamily: 'Kreon-Bold',
  },
  content: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f1dea9',
    borderRadius: 20,
    overflow: 'hidden',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: wp(4),
    paddingBottom: hp(2),
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(10),
  },
  emptyStateText: {
    fontSize: getFontSize(18),
    color: '#6f634f',
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  emptyStateSubText: {
    fontSize: getFontSize(14),
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: hp(2),
    alignItems: 'flex-end',
  },
  userMessageRow: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(2),
  },
  aiAvatar: {
    backgroundColor: '#6f634f',
  },
  userAvatar: {
    backgroundColor: '#b2ffe2',
  },
  avatarText: {
    fontSize: getFontSize(12),
    fontFamily: 'Kreon-Bold',
  },
  aiAvatarText: {
    color: '#fff',
  },
  userAvatarText: {
    color: '#000',
  },
  messageContent: {
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 16,
  },
  aiMessage: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0d4a3',
  },
  userMessage: {
    backgroundColor: '#b2ffe2',
  },
  messageText: {
    fontSize: getFontSize(14),
    color: '#000',
    fontFamily: 'Kreon-Regular',
    lineHeight: getFontSize(18),
  },
  userMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: getFontSize(10),
    color: '#6f634f',
    marginTop: hp(0.5),
    fontFamily: 'Kreon-Regular',
  },
  userMessageTime: {
    textAlign: 'right',
  },
  inputContainer: {
    padding: wp(4),
    backgroundColor: '#f1dea9',
    borderTopWidth: 1,
    borderTopColor: '#e0d4a3',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderWidth: 1,
    borderColor: '#e0d4a3',
  },
  textInput: {
    flex: 1,
    fontSize: getFontSize(14),
    color: '#000',
    fontFamily: 'Kreon-Regular',
    maxHeight: hp(15),
    minHeight: hp(5),
    textAlignVertical: 'center',
  },
  sendButton: {
    width: wp(10),
    height: wp(10),
    backgroundColor: '#b2ffe2',
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: getFontSize(18),
    color: '#000',
    fontFamily: 'Kreon-Bold',
  },
  recentContainer: {
    flex: 1,
    backgroundColor: '#f1dea9',
    borderRadius: 20,
    padding: wp(4),
  },
  recentTitle: {
    fontSize: getFontSize(20),
    fontFamily: 'Kreon-Bold',
    color: '#000',
    marginBottom: hp(2),
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: hp(5),
  },
  loadingText: {
    fontSize: getFontSize(14),
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
    marginTop: hp(1),
  },
  actionItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: '#e0d4a3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  actionLabel: {
    fontSize: getFontSize(12),
    fontFamily: 'Kreon-Bold',
    color: '#6f634f',
    marginBottom: hp(0.5),
  },
  actionText: {
    fontSize: getFontSize(14),
    fontFamily: 'Kreon-Regular',
    color: '#000',
    marginBottom: hp(1),
    lineHeight: getFontSize(18),
  },
  aiReplyText: {
    fontSize: getFontSize(14),
    color: '#000',
    fontFamily: 'Kreon-Regular',
    lineHeight: getFontSize(18),
  },
  actionTime: {
    fontSize: getFontSize(10),
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
  },
  bottomIndicator: {
    width: wp(35),
    height: 5,
    backgroundColor: '#f1dea9',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: hp(1),
  },
});

export default AIMessagingApp;