import React from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
} from 'react-native';
import { ChatItem, Conversation } from './ChatItem';

interface ChatListProps {
  conversations: Conversation[];
  selectedChats: string[];
  selectedUnlockChats: string[];
  selectionMode: boolean;
  unlockSelectionMode: boolean;
  onChatPress: (phone: string) => void;
  onChatLongPress: (phone: string) => void;
  onToggleChatSelection: (phone: string) => void;
  onToggleUnlockChatSelection: (phone: string) => void;
  normalizePhone: (phone: string) => string;
  lockedChats: string[];
  isUnlocked: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  selectedChats,
  selectedUnlockChats,
  selectionMode,
  unlockSelectionMode,
  onChatPress,
  onChatLongPress,
  onToggleChatSelection,
  onToggleUnlockChatSelection,
  normalizePhone,
  lockedChats,
  isUnlocked,
}) => {
  const getVisibleConversations = () => {
    if (isUnlocked) {
      return conversations; // Show all when unlocked
    } else {
      return conversations.filter(
        c => !lockedChats.includes(normalizePhone(c.phoneNumber))
      );
    }
  };

  const getLockedConversations = () => {
    return conversations.filter(
      c => lockedChats.includes(normalizePhone(c.phoneNumber))
    );
  };

  const handleChatPress = (phoneNumber: string) => {
    if (selectionMode) {
      onToggleChatSelection(phoneNumber);
      return;
    }
    
    if (unlockSelectionMode) {
      onToggleUnlockChatSelection(phoneNumber);
      return;
    }
    
    onChatPress(phoneNumber);
  };

  const handleChatLongPress = (phoneNumber: string) => {
    if (!selectionMode && !unlockSelectionMode) {
      onChatLongPress(phoneNumber);
    }
  };

  const renderChatItem = ({ item }: { item: Conversation }) => {
    const isSelected = selectedChats.includes(normalizePhone(item.phoneNumber));
    const isUnlockSelected = selectedUnlockChats.includes(normalizePhone(item.phoneNumber));
    
    return (
      <ChatItem
        item={item}
        isSelected={isSelected}
        isUnlockSelected={isUnlockSelected}
        selectionMode={selectionMode}
        unlockSelectionMode={unlockSelectionMode}
        onPress={() => handleChatPress(item.phoneNumber)}
        onLongPress={() => handleChatLongPress(item.phoneNumber)}
      />
    );
  };

  const getEmptyText = () => {
    if (unlockSelectionMode) {
      return 'No locked chats available';
    } else if (lockedChats.length > 0 && !isUnlocked) {
      return 'All chats are locked. Swipe down to unlock.';
    } else {
      return 'No conversations yet — start a chat!';
    }
  };

  return (
    <FlatList
      data={unlockSelectionMode ? getLockedConversations() : getVisibleConversations()}
      renderItem={renderChatItem}
      keyExtractor={(item, index) => item.id?.toString() || `chat-${index}`}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <Text style={styles.emptyText}>{getEmptyText()}</Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
});
