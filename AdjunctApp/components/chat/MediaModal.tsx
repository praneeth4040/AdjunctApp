import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  Linking,
} from 'react-native';

interface MediaModalProps {
  visible: boolean;
  uri: string;
  type: 'image' | 'video';
  onClose: () => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  visible,
  uri,
  type,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {type === 'image' ? (
            <Image
              source={{ uri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.modalVideoContainer}>
              <Text style={styles.modalVideoText}>Video Preview</Text>
              <Text style={styles.modalVideoHint}>Tap to open in external player</Text>
              <TouchableOpacity
                style={styles.modalVideoButton}
                onPress={() => {
                  Linking.openURL(uri);
                  onClose();
                }}
              >
                <Text style={styles.modalVideoButtonText}>▶️ Open Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    height: '100%',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    height: '80%',
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalVideoText: {
    fontSize: 24,
    fontFamily: 'Kreon-Bold',
    color: '#000',
    marginBottom: 8,
  },
  modalVideoHint: {
    fontSize: 16,
    fontFamily: 'Kreon-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  modalVideoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalVideoButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Kreon-Bold',
    fontWeight: '600',
  },
});
