import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusIndicator } from './StatusIndicator';
import { SelectionHeader } from './SelectionHeader';

type UserStatus = 'active' | 'semiactive' | 'offline';

interface HeaderProps {
  // Normal header props
  userName: string;
  userStatus: UserStatus;
  isSearchActive: boolean;
  onSearchPress: () => void;
  onStatusPress: () => void;
  onProfilePress: () => void;
  
  // Selection mode props
  selectionMode: boolean;
  unlockSelectionMode: boolean;
  selectedChatsCount: number;
  selectedUnlockChatsCount: number;
  onCancelSelection: () => void;
  onCancelUnlockSelection: () => void;
  onLockSelectedChats: () => void;
  onUnlockSelectedChats: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  userStatus,
  isSearchActive,
  onSearchPress,
  onStatusPress,
  onProfilePress,
  selectionMode,
  unlockSelectionMode,
  selectedChatsCount,
  selectedUnlockChatsCount,
  onCancelSelection,
  onCancelUnlockSelection,
  onLockSelectedChats,
  onUnlockSelectedChats,
}) => {
  if (selectionMode) {
    return (
      <View style={styles.header}>
        <SelectionHeader
          mode="lock"
          selectedCount={selectedChatsCount}
          onCancel={onCancelSelection}
          onConfirm={onLockSelectedChats}
        />
      </View>
    );
  }

  if (unlockSelectionMode) {
    return (
      <View style={styles.header}>
        <SelectionHeader
          mode="unlock"
          selectedCount={selectedUnlockChatsCount}
          onCancel={onCancelUnlockSelection}
          onConfirm={onUnlockSelectedChats}
        />
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Good morning</Text>
        <Text style={styles.username}>{userName || 'Loading...'}</Text>
      </View>
      
      <View style={styles.headerIcons}>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchPress}
        >
          <Ionicons name="search" size={24} color="black" />
        </TouchableOpacity>
        
        <StatusIndicator
          status={userStatus}
          onPress={onStatusPress}
        />
        
        <TouchableOpacity
          style={styles.profileCircle}
          onPress={onProfilePress}
        >
          <Ionicons name="person" size={20} color="#555" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Kreon-Regular',
    color: '#000',
  },
  username: {
    fontSize: 28,
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    marginRight: 16,
    padding: 4,
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5D4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
