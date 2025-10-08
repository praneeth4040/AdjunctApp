import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface ReplyBannerProps {
  replyMessage: string;
  onCancelReply: () => void;
}

export const ReplyBanner: React.FC<ReplyBannerProps> = ({
  replyMessage,
  onCancelReply,
}) => {
  if (!replyMessage) return null;

  return (
    <View style={styles.replyBanner}>
      <View style={styles.replyBannerContent}>
        <Text style={styles.replyBannerLabel}>Replying to:</Text>
        <Text style={styles.replyBannerText} numberOfLines={1}>
          {replyMessage}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancelReply} style={styles.cancelReplyButton}>
        <Text style={styles.cancelReplyText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9E9E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  replyBannerContent: { 
    flex: 1, 
    marginRight: 12 
  },
  replyBannerLabel: { 
    color: '#007AFF', 
    fontSize: 12, 
    fontFamily: "Kreon-Bold", 
    fontWeight: '600',
    marginBottom: 2 
  },
  replyBannerText: { 
    color: '#333', 
    flex: 1, 
    fontFamily: "Kreon-Regular", 
    fontSize: 14 
  },
  cancelReplyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReplyText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
});
