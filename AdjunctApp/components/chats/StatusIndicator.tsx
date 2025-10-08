import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type UserStatus = 'active' | 'semiactive' | 'offline';

interface StatusIndicatorProps {
  status: UserStatus;
  onPress: () => void;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  onPress,
}) => {
  const getStatusDotStyle = (currentStatus: UserStatus) => {
    switch (currentStatus) {
      case 'active': 
        return styles.activeDot;
      case 'semiactive': 
        return styles.semiactiveDot;
      case 'offline': 
        return styles.offlineDot;
      default: 
        return styles.offlineDot;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.statusTouchable}>
      <View style={[styles.statusDot, getStatusDotStyle(status)]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  statusTouchable: {
    padding: 4,
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FF9500',
  },
  semiactiveDot: {
    backgroundColor: '#34C759',
  },
  offlineDot: {
    backgroundColor: '#C4C4C4',
  },
});
