import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';

// Import custom hooks
import { useMessages } from '../../hooks/useMessages';
import { useMediaHandling } from '../../hooks/useMediaHandling';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { useMessageSelection } from '../../hooks/useMessageSelection';
import { useContacts } from '../../hooks/useContacts';
import { useAIAssistant } from '../../hooks/useAIAssistant';

// Import components
import {
  MessageBubble,
  MediaRenderer,
  MediaModal,
  ForwardModal,
  ClearChatModal,
  ReplyBanner,
  RecordingIndicator,
  MessageInput,
  ChatHeader,
  UploadProgress,
} from '../../components/chat';

// Import utilities
import { supabase } from '../../lib/supabase';
import { getOrCreateKeys, encryptMessage } from '../../lib/encrypt';

export default function ChatScreen({ onMessagesRead }: { onMessagesRead?: (phone: string) => void }) {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const [contactName, setContactName] = useState<string>('');
  const [loadingContact, setLoadingContact] = useState<boolean>(true);
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [mediaModal, setMediaModal] = useState<{visible: boolean, uri: string, type: 'image' | 'video'}>({
    visible: false,
    uri: '',
    type: 'image'
  });
const [showForwardModal, setShowForwardModal] = useState(false);
const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Refs
  const messageRef = useRef<FlatList>(null);

  // Phone numbers
  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
  const receiverPhone = normalizePhone((id as string) || '');
  const senderPhone = session?.user?.phone ? normalizePhone(session.user.phone) : '';

  // Custom hooks
  const { messages, loadMessages, markMessagesAsRead, updateConversationAfterSending } = useMessages(
    senderPhone,
    receiverPhone,
    privacyMode,
    onMessagesRead
  );

  const { uploadingMedia, handleMultimedia, uploadFileToSupabase, insertMediaMessage } = useMediaHandling(
    senderPhone,
    receiverPhone,
    privacyMode
  );

  const { recording, recordingDuration, isPlaying, pulseAnim, startRecording, stopRecording, playAudio } = useAudioRecording(
    (url: string, fileName: string) => insertMediaMessage(url, 'audio', fileName)
  );

  const {
    selectionMode,
    selectedMessages,
    toggleMessageSelection,
    enterSelectionMode,
    exitSelectionMode,
    selectAllMessages,
    deleteSelectedMessages,
    forwardMessages,
    clearAllChat,
  } = useMessageSelection(messages);

  const { contacts, loadContacts } = useContacts(senderPhone);

  const { handleAI, handleAICommand } = useAIAssistant(
    senderPhone,
    receiverPhone,
    updateConversationAfterSending
  );

  // Session management
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Load contact name
  useEffect(() => {
    const loadContactName = async () => {
      if (!receiverPhone) return;
      
      setLoadingContact(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('phone_number', receiverPhone)
                .single();

      if (error) {
          console.error('Error loading contact:', error);
          setContactName(receiverPhone);
        } else {
          setContactName(data?.name || receiverPhone);
            }
          } catch (err) {
        console.error('Unexpected error:', err);
        setContactName(receiverPhone);
      } finally {
        setLoadingContact(false);
      }
    };

    loadContactName();
  }, [receiverPhone]);

  // Focus effect for marking messages as read
  useFocusEffect(
    useCallback(() => {
      markMessagesAsRead();
    }, [markMessagesAsRead])
  );

  // Load contacts when forward modal opens
useEffect(() => {
  if (showForwardModal) {
    console.log("Forward modal opened, loading contacts...");
    loadContacts();
  }
  }, [showForwardModal, loadContacts]);

  // Scroll to bottom helper
  const scrollToBottom = () =>
    setTimeout(() => messageRef.current?.scrollToEnd({ animated: true }), 50);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || !senderPhone || !receiverPhone) return;
    
    const text = input.trim();
    const replyToStore = replyToMessage;

    try {
      let ciphertext: string | undefined;
      let nonce: string | undefined;

      if (privacyMode) {
        const { privateKeyBase64 } = await getOrCreateKeys(senderPhone);
        const { data: receiverProfile, error: rpErr } = await supabase
          .from('profiles')
          .select('public_key')
          .eq('phone_number', receiverPhone)
          .single();

        if (rpErr) throw rpErr;
        if (!receiverProfile?.public_key) throw new Error('Receiver public key not found');

        const encrypted = encryptMessage(text, receiverProfile.public_key, privateKeyBase64);
        ciphertext = encrypted.ciphertext;
        nonce = encrypted.nonce;
      }

      const { data: inserted, error } = await supabase.from('messages').insert({
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
        message: privacyMode ? '' : text,
        ciphertext,
        nonce,
        mode: privacyMode ? 'privacy' : 'compatibility',
        reply_to_message: replyToStore ?? null,
        is_read: false,
      }).select().single();

      if (error) throw error;

      await updateConversationAfterSending(
        senderPhone, 
        receiverPhone, 
        privacyMode ? '🔒 Encrypted message' : text
      );

      // Handle AI commands
      if (!privacyMode && text.startsWith('/ai ')) {
        const query = text.slice(4).trim();
        await handleAICommand(query, inserted.id, updateConversationAfterSending);
      }

      setInput('');
      setReplyToMessage(null);
      scrollToBottom();
    } catch (err: any) {
      console.error('Send failed:', err);
      Alert.alert('Error', err?.message ?? 'Failed to send message');
    }
  };

  // Message rendering
  const renderItem = ({ item }: { item: any }) => {
    const isMyMsg = item.sender_phone === senderPhone;
    const isBotMsg = item.is_ai;
    const isReplyMsg = !!item.reply_to_message;

    const displayMessage =
      !privacyMode && item.mode === 'privacy' ? '[Encrypted message]' : item.message;

    const renderMediaContent = () => (
      <MediaRenderer
        message={item}
        isMyMessage={isMyMsg}
        isPlaying={isPlaying}
        onOpenMediaModal={(uri, type) => setMediaModal({ visible: true, uri, type })}
        onPlayAudio={playAudio}
      />
    );

      return (
      <MessageBubble
        message={item}
        isMyMessage={isMyMsg}
        isBotMessage={isBotMsg}
        isReplyMessage={isReplyMsg}
        displayMessage={displayMessage}
        privacyMode={privacyMode}
        selectionMode={selectionMode}
        isSelected={selectedMessages.has(item.id)}
        onLongPress={() => enterSelectionMode(item.id)}
        onPress={() => setReplyToMessage(prev => prev === item.message ? null : item.message)}
        onToggleSelection={() => toggleMessageSelection(item.id)}
        renderMediaContent={renderMediaContent}
        themeStyles={privacyMode ? darkTheme : lightTheme}
      />
    );
  };

  // Theme styles
  const lightTheme = {
    safeArea: { backgroundColor: '#dcd0a8' },
    container: { backgroundColor: '#dcd0a8' },
    header: { backgroundColor: '#dcd0a8' },
    title: { color: '#000' },
    headerText: { color: '#000' },
    inputContainer: { backgroundColor: '#dcd0a8' },
    input: { 
      backgroundColor: '#F5F5DC', 
      color: '#000', 
      borderColor: '#C4B896',
    },
  };

  const darkTheme = {
    safeArea: { backgroundColor: '#2C2416' },
    container: { backgroundColor: '#2C2416' },
    header: { backgroundColor: '#3A301E', borderColor: '#4A3D2A' },
    title: { color: '#FFFFFF' },
    headerText: { color: '#FFFFFF' },
    inputContainer: { backgroundColor: '#2C2416', borderColor: '#4A3D2A' },
    input: { 
      backgroundColor: '#3A301E', 
      color: '#FFFFFF', 
      borderColor: '#4A3D2A',
    },
  };

  const themeStyles = privacyMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }, themeStyles.safeArea]}>
      <KeyboardAvoidingView
        style={[styles.container, themeStyles.container]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <ChatHeader
          contactName={contactName}
          receiverPhone={receiverPhone}
          privacyMode={privacyMode}
          onBackPress={() => router.back()}
          onMenuPress={() => setShowClearChatModal(true)}
          onPrivacyToggle={() => setPrivacyMode(!privacyMode)}
          selectionMode={selectionMode}
          selectedCount={selectedMessages.size}
          onExitSelection={exitSelectionMode}
          onSelectAll={selectAllMessages}
          onForwardMessages={() => {
            setContactSearch('');
            loadContacts();
            setShowForwardModal(true);
          }}
          onDeleteMessages={deleteSelectedMessages}
          themeStyles={themeStyles}
        />

        {/* Messages */}
        <FlatList
          ref={messageRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 8 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />

        {/* Reply Banner */}
        <ReplyBanner
          replyMessage={replyToMessage || ''}
          onCancelReply={() => setReplyToMessage(null)}
        />

        {/* Upload Progress */}
        <UploadProgress visible={uploadingMedia} />

        {/* Recording Indicator */}
        <RecordingIndicator
          recording={!!recording}
          duration={recordingDuration}
          pulseAnim={pulseAnim}
        />

        {/* Input */}
        <MessageInput
          input={input}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          onStartRecording={startRecording}
          onStopRecording={() => stopRecording(uploadFileToSupabase)}
          onMediaPress={handleMultimedia}
          recording={!!recording}
          uploadingMedia={uploadingMedia}
          privacyMode={privacyMode}
        />

        {/* Modals */}
        <MediaModal
          visible={mediaModal.visible}
          uri={mediaModal.uri}
          type={mediaModal.type}
          onClose={() => setMediaModal({ visible: false, uri: '', type: 'image' })}
        />

        <ForwardModal
          visible={showForwardModal}
          contacts={contacts}
          contactSearch={contactSearch}
          onContactSearchChange={setContactSearch}
          onClearSearch={() => setContactSearch('')}
          onForwardToContact={async (targetPhone) => {
            await forwardMessages(targetPhone, senderPhone);
            setShowForwardModal(false);
          }}
          onClose={() => setShowForwardModal(false)}
        />

        <ClearChatModal
          visible={showClearChatModal}
          onConfirm={async () => {
            await clearAllChat(senderPhone, receiverPhone);
            setShowClearChatModal(false);
          }}
          onCancel={() => setShowClearChatModal(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#dcd0a8' 
  },
  container: { 
  flex: 1,
  paddingHorizontal: 12,
    backgroundColor: '#dcd0a8' 
  },
});