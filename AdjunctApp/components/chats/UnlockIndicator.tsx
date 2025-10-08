import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UnlockIndicatorProps {
  lockedChatsCount: number;
  onToggleUnlockSelectionMode: () => void;
}

export const UnlockIndicator: React.FC<UnlockIndicatorProps> = ({
  lockedChatsCount,
  onToggleUnlockSelectionMode,
}) => {
  if (lockedChatsCount === 0) {
    return null;
  }

  return (
    <View style={styles.unlockIndicator}>
      <Ionicons name="chevron-down" size={16} color="#666" />
      <Text style={styles.unlockText}>
        Swipe down to unlock {lockedChatsCount} hidden chat(s)
      </Text>
      <TouchableOpacity
        style={styles.unlockSelectButton}
        onPress={onToggleUnlockSelectionMode}
      >
        <Text style={styles.unlockSelectButtonText}>Select to unlock</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  unlockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  unlockText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Kreon-Regular',
    flex: 1,
  },
  unlockSelectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unlockSelectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Kreon-Bold',
  },
});
