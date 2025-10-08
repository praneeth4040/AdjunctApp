import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface MessageInputProps {
  input: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onMediaPress: () => void;
  recording: boolean;
  uploadingMedia: boolean;
  privacyMode: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  input,
  onInputChange,
  onSendMessage,
  onStartRecording,
  onStopRecording,
  onMediaPress,
  recording,
  uploadingMedia,
  privacyMode,
}) => {
  return (
    <View style={[styles.inputContainer, privacyMode && styles.inputContainerPrivacy]}>
      {/* Media Button */}
      <TouchableOpacity style={styles.mediaButton} onPress={onMediaPress}>
        <Text style={styles.mediaIcon}>📎</Text>
      </TouchableOpacity>
      
      {/* Text Input */}
      <TextInput
        placeholder={recording ? "Recording..." : "Type a message or tap 📎 for media..."}
        placeholderTextColor={privacyMode ? '#bbb' : '#999'}
        style={[styles.input, privacyMode && styles.inputPrivacy]}
        value={input}
        onChangeText={onInputChange}
        returnKeyType="send"
        onSubmitEditing={onSendMessage}
        blurOnSubmit={false}
        multiline
        maxLength={1000}
        editable={!recording}
      />

      {/* Send/Record Button */}
      {input.trim() ? (
        <TouchableOpacity style={styles.sendButton} onPress={onSendMessage}>
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.micButton, recording && styles.micButtonRecording]}
          onPressIn={onStartRecording}
          onPressOut={onStopRecording}
          activeOpacity={0.7}
        >
          <Text style={styles.micButtonText}>🎤</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: 0.5,
    borderColor: "#C4B896",
    marginBottom: 4,
    gap: 8,
    backgroundColor: "#dcd0a8",
  },
  inputContainerPrivacy: {
    backgroundColor: "#2C2416",
    borderColor: "#4A3D2A",
  },
  mediaButton: {
    backgroundColor: "#E9E9E9",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mediaIcon: { 
    fontSize: 20, 
    transform: [{ rotate: '45deg' }], 
    color: "#666" 
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    fontFamily: "Kreon-Regular",
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'center',
    backgroundColor: "#F5F5DC",
    borderColor: "#C4B896",
    color: "#000",
  },
  inputPrivacy: {
    backgroundColor: "#3A301E",
    color: "#FFFFFF",
    borderColor: "#4A3D2A",
  },
  sendButton: {
    backgroundColor: "#34C759",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  sendButtonText: { 
    fontSize: 20, 
    color: "#fff", 
    fontWeight: "bold" 
  },
  micButton: {
    backgroundColor: "#007AFF",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  micButtonRecording: {
    backgroundColor: "#FF6B35",
  },
  micButtonText: { 
    fontSize: 20, 
    color: "#fff" 
  },
});
