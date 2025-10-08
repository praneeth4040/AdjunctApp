import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export interface Message {
  id: string;
  sender_phone: string;
  receiver_phone: string;
  message: string;
  ciphertext?: string;
  nonce?: string;
  mode?: "privacy" | "compatibility";
  created_at: string;
  is_read: boolean;
  reply_to_message?: string;
  is_ai?: boolean;
  media_url?: string;
  media_type?: "image" | "video" | "document" | "audio";
  file_name?: string;
  file_size?: number;
}

interface MessageBubbleProps {
  message: Message;
  isMyMessage: boolean;
  isBotMessage: boolean;
  isReplyMessage: boolean;
  displayMessage: string;
  privacyMode: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onLongPress: () => void;
  onPress: () => void;
  onToggleSelection: () => void;
  renderMediaContent: () => React.ReactNode;
  themeStyles: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMyMessage,
  isBotMessage,
  isReplyMessage,
  displayMessage,
  privacyMode,
  selectionMode,
  isSelected,
  onLongPress,
  onPress,
  onToggleSelection,
  renderMediaContent,
  themeStyles,
}) => {
  if (isMyMessage && isBotMessage) {
    return (
      <View style={[styles.messageWrapper, styles.aiWrapper]}>
        <Text style={styles.aiMsg}>{displayMessage}</Text>
        <Text style={styles.timeText}>
          {new Date(message.created_at).toLocaleTimeString([], { 
            hour: "2-digit", 
            minute: "2-digit" 
          })}
        </Text>
      </View>
    );
  }

  if (isBotMessage) {
    return (
      <View style={{ alignItems: 'center', marginVertical: 6 }}>
        <View style={[styles.botMsg, { maxWidth: '80%' }]}>
          <Text style={styles.botMsgText}>{displayMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      onLongPress={() => selectionMode ? null : onLongPress()}
      onPress={() => selectionMode ? onToggleSelection() : onPress()}
      activeOpacity={selectionMode ? 0.7 : 1}
    >
      <View
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myWrapper : styles.theirWrapper,
          isReplyMessage && styles.replyMsgContainer,
          isSelected && styles.selectedMessage,
        ]}
      >
        {/* Selection indicator */}
        {selectionMode && (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionCheckmark}>
              {isSelected ? '✓' : '○'}
            </Text>
          </View>
        )}
        
        {/* Reply indicator */}
        {isReplyMessage && (
          <View style={styles.replyToContainer}>
            <Text style={styles.replyToText} numberOfLines={1} ellipsizeMode="tail">
              Replying to: {message.reply_to_message}
            </Text>
          </View>
        )}

        {/* Media content */}
        {renderMediaContent()}

        {/* Message text */}
        {!!displayMessage && (
          <Text
            style={[
              isMyMessage ? styles.myMsg : styles.theirMsg,
              !privacyMode && message.mode === "privacy" && { 
                fontStyle: "italic", 
                color: "#888" 
              },
            ]}
          >
            {displayMessage}
          </Text>
        )}
        
        {/* Timestamp */}
        <Text style={styles.timeText}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageWrapper: { 
    maxWidth: "85%", 
    padding: 12, 
    marginVertical: 2, 
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myWrapper: { 
    alignSelf: "flex-end", 
    backgroundColor: "#F0E68C",
    borderBottomRightRadius: 4,
    marginLeft: 50,
  },
  theirWrapper: { 
    alignSelf: "flex-start", 
    backgroundColor: "#F5F5DC",
    borderBottomLeftRadius: 4,
    marginRight: 50,
  },
  myMsg: { 
    fontFamily: "Kreon-Regular", 
    color: "#000", 
    fontSize: 16, 
    lineHeight: 20 
  },
  theirMsg: { 
    fontFamily: "Kreon-Regular", 
    color: "#000", 
    fontSize: 16, 
    lineHeight: 20 
  },
  botMsg: { 
    backgroundColor: '#E9E9E9',
    padding: 12, 
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  botMsgText: { 
    fontFamily: 'Kreon-Regular', 
    fontStyle: 'italic', 
    textAlign: 'center', 
    fontSize: 15, 
    color: '#555'
  },
  timeText: { 
    fontSize: 10, 
    color: "#666", 
    marginTop: 4, 
    alignSelf: "flex-end",
    fontFamily: "Kreon-Regular"
  },
  replyMsgContainer: { 
    borderLeftWidth: 3, 
    borderLeftColor: '#007AFF', 
    paddingLeft: 8 
  },
  replyToContainer: { 
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderRadius: 8, 
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  replyToText: { 
    color: '#007AFF', 
    fontStyle: 'italic', 
    fontSize: 12, 
    fontFamily: "Kreon-Regular" 
  },
  aiWrapper: {
    alignSelf: "flex-end",
    backgroundColor: "#F0E68C",
    borderBottomRightRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9500",
  },
  aiMsg: {
    fontFamily: "Kreon-Regular",
    color: "#B8860B",
    fontSize: 15,
    fontStyle: "italic",
  },
  selectedMessage: {
    backgroundColor: '#E9E9E9',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  selectionCheckmark: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
