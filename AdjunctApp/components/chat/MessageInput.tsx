import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dynamic sizing based on screen width
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

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
        placeholder={recording ? "Recording..." : "Type a message..."}
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
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(8),
    borderTopWidth: 0.5,
    borderColor: "#C4B896",
    gap: moderateScale(8),
    backgroundColor: "#dcd0a8",
    minHeight: moderateScale(60),
    marginBottom: 0,
  },
  inputContainerPrivacy: {
    backgroundColor: "#2C2416",
    borderColor: "#4A3D2A",
  },
  mediaButton: {
    backgroundColor: "#E9E9E9",
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mediaIcon: { 
    fontSize: moderateScale(20), 
    transform: [{ rotate: '45deg' }], 
    color: "#666" 
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(14),
    borderRadius: moderateScale(22),
    fontFamily: "Kreon-Regular",
    fontSize: moderateScale(15),
    lineHeight: moderateScale(20),
    minHeight: moderateScale(44),
    maxHeight: moderateScale(100),
    textAlignVertical: 'center',
    backgroundColor: "#F5F5DC",
    borderColor: "#C4B896",
    color: "#000",
    ...Platform.select({
      ios: {
        paddingTop: moderateScale(12),
      },
      android: {
        paddingTop: moderateScale(10),
        textAlignVertical: 'center',
      },
    }),
  },
  inputPrivacy: {
    backgroundColor: "#3A301E",
    color: "#FFFFFF",
    borderColor: "#4A3D2A",
  },
  sendButton: {
    backgroundColor: "#34C759",
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  sendButtonText: { 
    fontSize: moderateScale(20), 
    color: "#fff", 
    fontWeight: "bold" 
  },
  micButton: {
    backgroundColor: "#007AFF",
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
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
    fontSize: moderateScale(20), 
    color: "#fff" 
  },
});