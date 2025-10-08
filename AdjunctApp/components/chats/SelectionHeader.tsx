import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SelectionHeaderProps {
  mode: 'lock' | 'unlock';
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SelectionHeader: React.FC<SelectionHeaderProps> = ({
  mode,
  selectedCount,
  onCancel,
  onConfirm,
}) => {
  const isLockMode = mode === 'lock';
  const isDisabled = selectedCount === 0;

  return (
    <View style={styles.selectionHeader}>
      <TouchableOpacity onPress={onCancel} style={styles.exitButton}>
        <Ionicons name="close" size={24} color="black" />
        <Text style={styles.exitText}>Cancel</Text>
      </TouchableOpacity>
      
      <Text style={styles.selectionCount}>
        {selectedCount} selected
      </Text>
      
      <TouchableOpacity
        onPress={onConfirm}
        disabled={isDisabled}
        style={[
          isLockMode ? styles.lockButton : styles.unlockButton,
          isDisabled && styles.disabledButton
        ]}
      >
        <Ionicons 
          name={isLockMode ? "lock-closed" : "lock-open"} 
          size={20} 
          color="#fff" 
        />
        <Text style={styles.buttonText}>
          {isLockMode ? 'Lock' : 'Unlock'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  exitText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#000',
    fontFamily: 'Kreon-Regular',
  },
  selectionCount: {
    fontSize: 18,
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  lockButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#C4C4C4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    fontFamily: 'Kreon-Bold',
  },
});
