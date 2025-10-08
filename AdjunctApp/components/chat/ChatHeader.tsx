import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface ChatHeaderProps {
  // Normal header props
  contactName: string;
  receiverPhone: string;
  privacyMode: boolean;
  onBackPress: () => void;
  onMenuPress: () => void;
  onPrivacyToggle: () => void;
  
  // Selection mode props
  selectionMode: boolean;
  selectedCount: number;
  onExitSelection: () => void;
  onSelectAll: () => void;
  onForwardMessages: () => void;
  onDeleteMessages: () => void;
  
  themeStyles: any;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  contactName,
  receiverPhone,
  privacyMode,
  onBackPress,
  onMenuPress,
  onPrivacyToggle,
  selectionMode,
  selectedCount,
  onExitSelection,
  onSelectAll,
  onForwardMessages,
  onDeleteMessages,
  themeStyles,
}) => {
  if (selectionMode) {
    return (
      <View style={[styles.header, themeStyles.header]}>
        <TouchableOpacity style={styles.backButton} onPress={onExitSelection}>
          <Text style={[styles.backButtonText, themeStyles.headerText]}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.selectionInfo}>
          <Text style={[styles.selectionCount, themeStyles.title]}>
            {selectedCount} selected
          </Text>
        </View>
        
        <View style={styles.selectionActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onSelectAll}>
            <Text style={styles.actionIcon}>☑️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onForwardMessages}>
            <Text style={styles.actionIcon}>↗️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onDeleteMessages}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.header, themeStyles.header]}>
      <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
        <Text style={[styles.backButtonText, themeStyles.headerText]}>&lt;</Text>
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={[styles.title, themeStyles.title]}>
          {contactName || receiverPhone}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <Text style={[styles.menuIcon, themeStyles.headerText]}>⋮</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={onPrivacyToggle}
        style={[styles.privacyToggleBtn, { backgroundColor: privacyMode ? '#4caf50' : '#d32f2f' }]}
      >
        <Text style={styles.privacyToggleText}>
          {privacyMode ? 'Privacy' : 'Standard'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
    paddingHorizontal: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#dcd0a8",
    borderBottomWidth: 0.5,
    borderBottomColor: "#C4B896",
    elevation: 0,
    shadowColor: "transparent",
  },
  titleContainer: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    width: "100%" 
  },
  title: { 
    fontSize: 18, 
    fontFamily: "Kreon-Bold", 
    fontWeight: '600', 
    color: "#000" 
  },
  privacyToggleBtn: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    backgroundColor: "#007AFF",
  },
  privacyToggleText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 11 
  },
  backButton: { 
    width: 44, 
    height: 44, 
    alignItems: "center", 
    justifyContent: "center",
    borderRadius: 22,
  },
  backButtonText: { 
    fontSize: 24, 
    fontFamily: "Kreon-Bold", 
    fontWeight: '600', 
    color: "#000" 
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  selectionInfo: {
    flex: 1,
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 18,
    color: 'white',
  },
});
