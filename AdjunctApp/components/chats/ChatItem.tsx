import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Conversation {
  id: string | number;
  phoneNumber: string;
  name: string;
  profileImage: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  status?: 'active' | 'semiactive' | 'offline';
}

interface ChatItemProps {
  item: Conversation;
  isSelected: boolean;
  isUnlockSelected: boolean;
  selectionMode: boolean;
  unlockSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({
  item,
  isSelected,
  isUnlockSelected,
  selectionMode,
  unlockSelectionMode,
  onPress,
  onLongPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chatItem,
        ((selectionMode && isSelected) || (unlockSelectionMode && isUnlockSelected)) && styles.selectedChatItem
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {(selectionMode || unlockSelectionMode) && (
        <View style={styles.selectionCircle}>
          {(isSelected || isUnlockSelected) && <View style={styles.selectionFill} />}
        </View>
      )}
      
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      ) : (
        <View style={styles.defaultAvatar}>
          <Ionicons name="person" size={24} color="#666" />
        </View>
      )}
      
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.chatTime}>{item.time}</Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectedChatItem: {
    backgroundColor: '#E3F2FD',
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionFill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#D3D3D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
  },
  chatMessage: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'Kreon-Regular',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Kreon-Regular',
  },
  unreadBadge: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
