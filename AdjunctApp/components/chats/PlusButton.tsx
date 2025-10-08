import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlusButtonProps {
  onPress: () => void;
}

export const PlusButton: React.FC<PlusButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.plusButton}
      onPress={onPress}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  plusButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
