import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Linking,
} from 'react-native';
import { Message } from './MessageBubble';

const { width: screenWidth } = Dimensions.get('window');

interface MediaRendererProps {
  message: Message;
  isMyMessage: boolean;
  isPlaying: { [key: string]: boolean };
  onOpenMediaModal: (uri: string, type: 'image' | 'video') => void;
  onPlayAudio: (uri: string, messageId: string) => void;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({
  message,
  isMyMessage,
  isPlaying,
  onOpenMediaModal,
  onPlayAudio,
}) => {
  if (!message.media_url) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  switch (message.media_type) {
    case 'image':
      return (
        <View style={styles.mediaContainer}>
          <TouchableOpacity onPress={() => onOpenMediaModal(message.media_url!, 'image')}>
            <Image
              source={{ uri: message.media_url }}
              style={styles.imageMessage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      );

    case 'video':
      return (
        <View style={styles.mediaContainer}>
          <TouchableOpacity onPress={() => onOpenMediaModal(message.media_url!, 'video')}>
            <Image
              source={{ uri: message.media_url }}
              style={styles.imageMessage}
              resizeMode="cover"
            />
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶️</Text>
            </View>
          </TouchableOpacity>
        </View>
      );

    case 'document':
      return (
        <TouchableOpacity
          onPress={() => Linking.openURL(message.media_url!)}
          style={[styles.documentContainer, isMyMessage ? styles.myDocument : styles.theirDocument]}
        >
          <View style={styles.documentIcon}>
            <Text style={styles.documentIconText}>📄</Text>
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={1}>
              {message.file_name || 'Document'}
            </Text>
            <Text style={styles.documentSize}>
              {message.file_size ? formatFileSize(message.file_size) : 'Unknown size'}
            </Text>
          </View>
        </TouchableOpacity>
      );

    case "audio":
      const isCurrentlyPlaying = isPlaying[message.id];
      return (
        <TouchableOpacity
          onPress={() => onPlayAudio(message.media_url!, message.id)}
          style={[styles.audioContainer, isMyMessage ? styles.myAudio : styles.theirAudio]}
          disabled={isCurrentlyPlaying}
        >
          <View style={styles.audioIcon}>
            <Text style={styles.audioIconText}>
              {isCurrentlyPlaying ? "⏸️" : "▶️"}
            </Text>
          </View>
          <View style={styles.audioWaveform}>
            <View style={styles.audioWave} />
            <View style={styles.audioWave} />
            <View style={styles.audioWave} />
            <View style={styles.audioWave} />
            <View style={styles.audioWave} />
          </View>
          <Text style={styles.audioDuration}>0:30</Text>
        </TouchableOpacity>
      );

    default:
      return null;
  }
};

const styles = StyleSheet.create({
  mediaContainer: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageMessage: {
    width: Math.min(250, screenWidth * 0.6),
    height: Math.min(250, screenWidth * 0.6),
    borderRadius: 12,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { 
    fontSize: 16, 
    color: 'white' 
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
    minWidth: 200,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myDocument: { 
    backgroundColor: '#F0E68C' 
  },
  theirDocument: { 
    backgroundColor: '#E9E9E9' 
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentIconText: { 
    fontSize: 18, 
    color: 'white' 
  },
  documentInfo: { 
    flex: 1 
  },
  documentName: {
    fontFamily: 'Kreon-Bold',
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  documentSize: {
    fontFamily: 'Kreon-Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    marginBottom: 4,
    minWidth: 180,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myAudio: { 
    backgroundColor: '#F0E68C' 
  },
  theirAudio: { 
    backgroundColor: '#E9E9E9' 
  },
  audioIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  audioIconText: { 
    fontSize: 14, 
    color: 'white' 
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    height: 20,
  },
  audioWave: {
    width: 3,
    height: 12,
    backgroundColor: '#34C759',
    marginRight: 2,
    borderRadius: 2,
  },
  audioDuration: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Kreon-Regular',
    minWidth: 30,
  },
});
