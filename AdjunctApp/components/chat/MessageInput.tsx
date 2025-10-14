import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamic sizing based on screen width
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Colors
const COLORS = {
  primary: '#dcd0a8',
  primaryDark: '#2C2416',
  white: '#FFFFFF',
  lightGray: '#F5F5DC',
  gray: '#C4B896',
  darkGray: '#4A3D2A',
  black: '#000000',
  red: '#FF6B35',
  green: '#34C759',
  inputBackground: '#F5F5DC',
  inputText: '#000000',
  placeholder: '#999999',
  divider: '#C4B896',
  safeViewBackground: 'rgba(220, 208, 168, 0.9)',
};

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
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage();
      // Animate send button
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleRecordPressIn = () => {
    onStartRecording();
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  };

  const handleRecordPressOut = () => {
    onStopRecording();
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const renderInputIcons = () => (
    <View style={styles.inputIconsContainer}>
<TouchableOpacity 
        style={styles.emojiButton}
        onPress={() => {}}
        disabled={recording}
      >
        <Ionicons 
          name="happy-outline" 
          size={24} 
          color={privacyMode ? COLORS.gray : COLORS.darkGray} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.attachmentButton}
        onPress={onMediaPress}
        disabled={recording}
      >
        <MaterialCommunityIcons 
          name="attachment" 
          size={22} 
          color={privacyMode ? COLORS.gray : COLORS.darkGray} 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, privacyMode && styles.containerPrivacy]}>
      <View style={styles.safeAreaContent}>
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        {renderInputIcons()}
        
        <TextInput
          placeholder={recording ? 'Recording...' : 'Message'}
          placeholderTextColor={privacyMode ? COLORS.gray : COLORS.placeholder}
          style={[styles.input, privacyMode && styles.inputPrivacy]}
          value={input}
          onChangeText={onInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="send"
          onSubmitEditing={input.trim() ? handleSend : undefined}
          blurOnSubmit={false}
          multiline
          maxLength={1000}
          editable={!recording}
          textAlignVertical="center"
          underlineColorAndroid="transparent"
        />

        {uploadingMedia ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : input.trim() ? (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={handleSend}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.micButton, recording && styles.micButtonRecording]}
              onPressIn={handleRecordPressIn}
              onPressOut={handleRecordPressOut}
              activeOpacity={0.8}
            >
              {recording ? (
                <Ionicons name="mic-off" size={22} color={COLORS.white} />
              ) : (
                <Ionicons name="mic" size={22} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
      
      {recording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording... Swipe up to cancel</Text>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.divider,
  },
  safeAreaContent: {
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  containerPrivacy: {
    backgroundColor: COLORS.primaryDark,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 20,
    marginHorizontal: moderateScale(8),
    marginVertical: moderateScale(8),
    paddingHorizontal: moderateScale(4),
    minHeight: moderateScale(44),
    maxHeight: moderateScale(120),
    borderWidth: 0.5,
    borderColor: COLORS.gray,
  },
  inputContainerFocused: {
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  inputIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: moderateScale(4),
  },
  emojiButton: {
    padding: moderateScale(8),
    marginRight: moderateScale(2),
  },
  attachmentButton: {
    padding: moderateScale(8),
    marginRight: moderateScale(2),
  },
  safeViewButton: {
    padding: moderateScale(8),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: COLORS.inputText,
    maxHeight: moderateScale(100),
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(4),
    marginLeft: moderateScale(4),
    fontFamily: 'System',
    textAlignVertical: 'center',
    paddingTop: Platform.OS === 'ios' ? moderateScale(10) : moderateScale(8),
  },
  inputPrivacy: {
    color: COLORS.white,
  },
  sendButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(4),
    marginRight: moderateScale(4),
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  micButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(4),
    marginRight: moderateScale(4),
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  micButtonRecording: {
    backgroundColor: COLORS.red,
  },
  uploadingContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(4),
    marginRight: moderateScale(4),
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(6),
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    marginHorizontal: moderateScale(8),
    marginBottom: moderateScale(4),
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.red,
    marginRight: 8,
  },
  recordingText: {
    color: COLORS.darkGray,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
});