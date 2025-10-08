import React from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';

interface RecordingIndicatorProps {
  recording: boolean;
  duration: number;
  pulseAnim: Animated.Value;
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  recording,
  duration,
  pulseAnim,
}) => {
  if (!recording) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.recordingContainer}>
      <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
      <Text style={styles.recordingText}>Recording... {formatDuration(duration)}</Text>
      <Text style={styles.recordingHint}>Release to send</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E68C',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
    marginRight: 8,
  },
  recordingText: {
    color: '#B8860B',
    fontFamily: "Kreon-Bold",
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  recordingHint: {
    color: '#666',
    fontFamily: "Kreon-Regular",
    fontSize: 12,
    fontStyle: 'italic',
  },
});
