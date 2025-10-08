import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface UploadProgressProps {
  visible: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.uploadingContainer}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.uploadingText}>Uploading media...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9E9E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#666',
    fontFamily: "Kreon-Regular",
    fontSize: 14,
  },
});
