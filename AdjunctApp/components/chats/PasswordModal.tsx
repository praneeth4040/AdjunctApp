import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

interface PasswordModalProps {
  visible: boolean;
  isSettingPassword: boolean;
  passwordInput: string;
  confirmPasswordInput: string;
  onPasswordChange: (text: string) => void;
  onConfirmPasswordChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  visible,
  isSettingPassword,
  passwordInput,
  confirmPasswordInput,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {isSettingPassword ? 'Set Lock Password' : 'Enter Password'}
          </Text>
          
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter password"
            value={passwordInput}
            onChangeText={onPasswordChange}
            secureTextEntry
            autoFocus
          />
          
          {isSettingPassword && (
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm password"
              value={confirmPasswordInput}
              onChangeText={onConfirmPasswordChange}
              secureTextEntry
            />
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={onSubmit}
            >
              <Text style={styles.modalConfirmText}>
                {isSettingPassword ? 'Set Password' : 'Lock Chats'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'Kreon-Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Kreon-Regular',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Kreon-Bold',
  },
});
