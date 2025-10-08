import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StatusBar,
  Alert,
  Animated,
  BackHandler,
  StyleSheet,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

// Import custom hooks
import {
  useContacts,
  useUserProfile,
  useUserStatus,
  useConversations,
  useChatLock,
} from '../../hooks';

// Import components
import {
  Header,
  ChatList,
  UnlockIndicator,
  PasswordModal,
  UnlockModal,
  PlusButton,
} from '../../components/chats';

// Import utilities
import { supabase } from '../../lib/supabase';
import { fetchLocal, insertLocal } from '../../library/database';
import { v4 as uuidv4 } from 'uuid';

export default function ChatsScreen() {
  // Router
  const router = useRouter();
  
  // Custom hooks
  const { contactsMap, contactsLoaded, loadContacts, normalizePhone } = useContacts();
  const { userName, phoneNumber, initializeUser } = useUserProfile();
  const { userStatus, initializeUserStatus, subscribeToStatusChanges, toggleUserStatus, cleanup: cleanupStatus } = useUserStatus();
  const { conversations, fetchConversations, markMessagesAsRead, subscribeToMessages, cleanup: cleanupConversations } = useConversations();
  const {
    lockedChats,
    isUnlocked,
    fetchLockedChats,
    checkPasswordExists,
    handleUnlockRequest,
    handleUnlockVerification,
    handleLockSelectedChats,
    handleUnlockSelectedChats,
    getLocalLockPassword,
    getSupabaseLockPassword,
  } = useChatLock();

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [unlockSelectionMode, setUnlockSelectionMode] = useState(false);
  const [selectedUnlockChats, setSelectedUnlockChats] = useState<string[]>([]);
  
  // Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  
  // Swipe gesture for unlock
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Initialize user data
  const fetchUserAndContacts = useCallback(async () => {
    if (isInitialized) return;
    
    const contacts = await loadContacts();
    const storedPhone = await initializeUser();
    
    if (storedPhone) {
      await initializeUserStatus(storedPhone);
      subscribeToStatusChanges(storedPhone);
      
      // Run migration once
      await migrateExistingData(storedPhone);
      
      // Fetch conversations and set up subscriptions
      await fetchConversations(storedPhone, contactsMap);
      subscribeToMessages(storedPhone);
      await fetchLockedChats(storedPhone);
        setIsInitialized(true);
      }
  }, [isInitialized, loadContacts, initializeUser, initializeUserStatus, subscribeToStatusChanges, fetchConversations, subscribeToMessages, fetchLockedChats]);

  // Migration function
  const migrateExistingData = async (userPhone: string) => {
    try {
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_phone', userPhone)
        .limit(1);
      
      if (existingConversations && existingConversations.length > 0) {
        console.log('Conversations already migrated');
        return;
      }
      
      console.log('Migrating existing messages to conversations table...');
      
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_phone.eq.${userPhone},receiver_phone.eq.${userPhone}`)
        .order('created_at', { ascending: false });
      
      if (!allMessages) return;
      
      const conversationMap = new Map();
      
      allMessages.forEach(msg => {
        const contactPhone = msg.sender_phone === userPhone ? msg.receiver_phone : msg.sender_phone;
        const isIncoming = msg.receiver_phone === userPhone;
        
        if (!conversationMap.has(contactPhone)) {
          conversationMap.set(contactPhone, {
            contact_phone: contactPhone,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: 0
          });
        }
        
        const conv = conversationMap.get(contactPhone);
        
        if (isIncoming && !msg.is_read) {
          conv.unread_count++;
        }
        
        if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
          conv.last_message = msg.message;
          conv.last_message_time = msg.created_at;
        }
      });
      
      const conversationsToInsert = Array.from(conversationMap.entries()).map(([contactPhone, data]) => ({
        user_phone: userPhone,
        contact_phone: contactPhone,
        contact_name: contactsMap[contactPhone] || contactPhone,
        last_message: data.last_message,
        last_message_time: data.last_message_time,
        unread_count: data.unread_count
      }));
      
      const { error } = await supabase
        .from('conversations')
        .insert(conversationsToInsert);
      
      if (error) {
        console.error('Migration error:', error);
      } else {
        console.log(`Migrated ${conversationsToInsert.length} conversations`);
      }
      
    } catch (error) {
      console.error('Error in migration:', error);
    }
  };
  
  // Selection mode functions
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedChats([]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedChats([]);
  };

  const toggleChatSelection = (phoneNumber: string) => {
    const normalizedPhone = normalizePhone(phoneNumber);
    setSelectedChats(prev => 
      prev.includes(normalizedPhone) 
        ? prev.filter(p => p !== normalizedPhone)
        : [...prev, normalizedPhone]
    );
  };

  const toggleUnlockSelectionMode = () => {
    setUnlockSelectionMode(!unlockSelectionMode);
    setSelectedUnlockChats([]);
  };

  const exitUnlockSelectionMode = () => {
    setUnlockSelectionMode(false);
    setSelectedUnlockChats([]);
  };

  const toggleUnlockChatSelection = (phoneNumber: string) => {
    const normalizedPhone = normalizePhone(phoneNumber);
    setSelectedUnlockChats(prev => 
      prev.includes(normalizedPhone) 
        ? prev.filter(p => p !== normalizedPhone)
        : [...prev, normalizedPhone]
    );
  };

  // Chat actions
  const handleOpenChat = (phone: string) => {
    if (selectionMode) {
      toggleChatSelection(phone);
      return;
    }
    
    if (unlockSelectionMode) {
      toggleUnlockChatSelection(phone);
      return;
    }
    
    markMessagesAsRead(phone, phoneNumber);
    router.push(`/chats/${phone}`);
  };

  const handleChatLongPress = (phone: string) => {
    if (!selectionMode && !unlockSelectionMode) {
      setSelectionMode(true);
      toggleChatSelection(phone);
    }
  };

  // Password and lock functions
  const handleLockSelectedChatsPress = async () => {
    if (selectedChats.length === 0) {
      Alert.alert("No Selection", "Please select chats to lock");
      return;
    }

    const passwordExists = await checkPasswordExists(phoneNumber);
    
    if (!passwordExists) {
      setIsSettingPassword(true);
      setShowPasswordModal(true);
      } else {
      setIsSettingPassword(false);
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async () => {
    const success = await handleLockSelectedChats(
      selectedChats,
      phoneNumber,
      passwordInput,
      confirmPasswordInput,
      isSettingPassword
    );

    if (success) {
      setSelectedChats([]);
      setSelectionMode(false);
      setShowPasswordModal(false);
      setPasswordInput('');
      setConfirmPasswordInput('');
    }
  };

  const handleUnlockSelectedChatsPress = async () => {
    const success = await handleUnlockSelectedChats(selectedUnlockChats, phoneNumber);
    
    if (success) {
      setSelectedUnlockChats([]);
      setUnlockSelectionMode(false);
    }
  };

  const handleUnlockRequestPress = async () => {
    const canUnlock = await handleUnlockRequest(phoneNumber);
    if (canUnlock) {
      setShowUnlockModal(true);
    }
  };

  const handleUnlockVerificationPress = async () => {
    const success = await handleUnlockVerification(unlockPasswordInput, phoneNumber);
    
    if (success) {
      setShowUnlockModal(false);
      setUnlockPasswordInput('');
    }
  };

  // Swipe gesture handler
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) { // END state
      if (event.nativeEvent.translationY > 50) {
        handleUnlockRequestPress();
      }
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  // Handle Android back button
  const handleBackPress = () => {
    if (selectionMode) {
      exitSelectionMode();
      return true;
    }
    if (unlockSelectionMode) {
      exitUnlockSelectionMode();
      return true;
    }
    return false;
  };

  // Effects
  useFocusEffect(
    useCallback(() => {
      if (phoneNumber && contactsLoaded && isInitialized) {
        fetchConversations(phoneNumber, contactsMap);
      }
    }, [phoneNumber, contactsLoaded, isInitialized, fetchConversations, contactsMap])
  );

  useEffect(() => {
    fetchUserAndContacts();
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      cleanupStatus();
      cleanupConversations();
      backHandler.remove();
    };
  }, [fetchUserAndContacts, selectionMode, cleanupStatus, cleanupConversations]);

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />
        
        {/* Header */}
        <Header
          userName={userName}
          userStatus={userStatus}
          isSearchActive={isSearchActive}
          onSearchPress={() => setIsSearchActive(!isSearchActive)}
          onStatusPress={() => toggleUserStatus(phoneNumber)}
          onProfilePress={() => router.push("/home/settings")}
          selectionMode={selectionMode}
          unlockSelectionMode={unlockSelectionMode}
          selectedChatsCount={selectedChats.length}
          selectedUnlockChatsCount={selectedUnlockChats.length}
          onCancelSelection={exitSelectionMode}
          onCancelUnlockSelection={exitUnlockSelectionMode}
          onLockSelectedChats={handleLockSelectedChatsPress}
          onUnlockSelectedChats={handleUnlockSelectedChatsPress}
        />

        {/* Swipe area for unlock */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View style={styles.chatsSection}>
            {/* Unlock indicator */}
            {!isUnlocked && !unlockSelectionMode && (
              <UnlockIndicator
                lockedChatsCount={lockedChats.length}
                onToggleUnlockSelectionMode={toggleUnlockSelectionMode}
              />
            )}
            
            {/* Chat list */}
            <ChatList
              conversations={conversations}
              selectedChats={selectedChats}
              selectedUnlockChats={selectedUnlockChats}
              selectionMode={selectionMode}
              unlockSelectionMode={unlockSelectionMode}
              onChatPress={handleOpenChat}
              onChatLongPress={handleChatLongPress}
              onToggleChatSelection={toggleChatSelection}
              onToggleUnlockChatSelection={toggleUnlockChatSelection}
              normalizePhone={normalizePhone}
              lockedChats={lockedChats}
              isUnlocked={isUnlocked}
            />
          </Animated.View>
        </PanGestureHandler>

        {/* Modals */}
        <PasswordModal
          visible={showPasswordModal}
          isSettingPassword={isSettingPassword}
          passwordInput={passwordInput}
          confirmPasswordInput={confirmPasswordInput}
          onPasswordChange={setPasswordInput}
          onConfirmPasswordChange={setConfirmPasswordInput}
          onSubmit={handlePasswordSubmit}
          onCancel={() => {
                    setShowPasswordModal(false);
            setPasswordInput('');
            setConfirmPasswordInput('');
          }}
        />

        <UnlockModal
          visible={showUnlockModal}
          unlockPasswordInput={unlockPasswordInput}
          onPasswordChange={setUnlockPasswordInput}
          onSubmit={handleUnlockVerificationPress}
          onCancel={() => {
                    setShowUnlockModal(false);
            setUnlockPasswordInput('');
          }}
        />

        {/* Plus button */}
        <PlusButton onPress={() => router.push("/new-chat")} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: "#E9E9E9" },
  container: { flex: 1, backgroundColor: "#dcd0a8" },
  chatsSection: {
    flex: 1,
    backgroundColor: "#E9E9E9",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden" as const,
  },
});