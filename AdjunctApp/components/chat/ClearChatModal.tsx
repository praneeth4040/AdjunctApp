import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

interface ClearChatModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearChatModal: React.FC<ClearChatModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.clearChatModal}>
          <Text style={styles.clearChatTitle}>Clear Chat</Text>
          <Text style={styles.clearChatMessage}>
            This will delete all messages in this chat. This action cannot be undone.
          </Text>
          
          <View style={styles.clearChatActions}>
            <TouchableOpacity
              style={[styles.clearChatButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.clearChatButton, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearChatModal: {
    backgroundColor: '#F5F5DC',
    margin: 20,
    borderRadius: 12,
    padding: 24,
    elevation: 5,
  },
  clearChatTitle: {
    fontSize: 20,
    fontFamily: 'Kreon-Bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  clearChatMessage: {
    fontSize: 16,
    fontFamily: 'Kreon-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  clearChatActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  clearChatButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#E9E9E9',
  },
  confirmButton: {
    backgroundColor: '#FF6B35',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
  },
});
