import React, { useState } from "react";
import {
  View,
  Text,
  TextInput, 
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive helper functions
const wp = (percentage: number): number => (screenWidth * percentage) / 100;
const hp = (percentage: number): number => (screenHeight * percentage) / 100;

// Font scaling based on screen width
const getFontSize = (size: number): number => {
  const scale = screenWidth / 375; // Base width (iPhone X/11/12/13 width)
  const newSize = size * scale;
  return Math.max(12, Math.min(newSize, size * 1.2)); // Min 12, max 20% larger than original
};

type AICapability = {
  id: string;
  title: string;
  description: string;
  selected: boolean;
};

const AISetup = () => {
  const [aiName, setAiName] = useState("");
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<AICapability[]>([
    {
      id: "send_message",
      title: "Send Message",
      description: "Allow {aiName} to send messages on your behalf",
      selected: true,
    },
    {
      id: "receive_message",
      title: "Receive Message",
      description: "Enable {aiName} to receive and process incoming messages",
      selected: true,
    },
    
  ]);

  const insets = useSafeAreaInsets();

  const toggleCapability = (id: string) => {
    setCapabilities(prev =>
      prev.map(cap =>
        cap.id === id ? { ...cap, selected: !cap.selected } : cap
      )
    );
  };

  const handleSetupComplete = () => {
    if (aiName.trim() === "") {
      Alert.alert("Error", "Please enter a name for your AI");
      return;
    }

    const selectedCapabilities = capabilities.filter(cap => cap.selected);
    if (selectedCapabilities.length === 0) {
      Alert.alert("Error", "Please select at least one capability for your AI");
      return;
    }

    // Here you would typically save the AI configuration
    Alert.alert(
      "AI Setup Complete!",
      `${aiName} has been configured with ${selectedCapabilities.length} capabilities.`,
      [{ text: "OK", onPress: () => console.log("AI setup completed") }]
    );
    router.push('/home/ai')
  };

  const selectedCount = capabilities.filter(cap => cap.selected).length;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#dcd0a8" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant Setup</Text>
        <Text style={styles.subtitle}>Configure your personal AI agent</Text>
      </View>

      {/* Progress Indicators */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(selectedCount / 2) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {selectedCount} of 2 capabilities selected
        </Text>
      </View>

      <View style={styles.content}>
        {/* AI Name Section */}
        <View style={styles.nameSection}>
          <Text style={styles.sectionTitle}>AI Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter your AI's name..."
            placeholderTextColor="#6f634f"
            value={aiName}
            onChangeText={setAiName}
            maxLength={30}
          />
        </View>

        {/* Capabilities Section */}
        <View style={styles.capabilitiesSection}>
          <Text style={styles.sectionTitle}>AI Capabilities</Text>
          <View style={styles.capabilitiesGrid}>
            {capabilities.map((capability, index) => (
              <TouchableOpacity
                key={capability.id}
                style={[
                  styles.capabilityCard,
                  capability.selected && styles.selectedCapabilityCard
                ]}
                onPress={() => toggleCapability(capability.id)}
                activeOpacity={0.7}
              >
                <View style={styles.capabilityContent}>
                  <View style={[styles.checkbox, capability.selected && styles.checkedBox]}>
                    {capability.selected && <View style={styles.innerCircle} />}
                  </View>
                  <Text style={[
                    styles.capabilityTitle,
                    capability.selected && styles.selectedCapabilityTitle
                  ]}>
                    {capability.title}
                  </Text>
                  <Text style={[
                    styles.capabilityDescription,
                    capability.selected && styles.selectedCapabilityDescription
                  ]}>
                    {capability.description.replace('{aiName}', aiName.trim() || 'Adjunct')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Setup Button */}
        <TouchableOpacity 
          style={[
            styles.setupButton,
            (aiName.trim() && selectedCount > 0) && styles.setupButtonActive
          ]} 
          onPress={handleSetupComplete}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.setupButtonText,
            (aiName.trim() && selectedCount > 0) && styles.setupButtonTextActive
          ]}>
            Complete AI Setup
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Indicator */}
      <View style={styles.bottomIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#dcd0a8',
    paddingHorizontal: wp(5),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  title: {
    fontSize: getFontSize(24),
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    color: '#000',
    marginBottom: hp(0.5),
  },
  subtitle: {
    fontSize: getFontSize(14),
    fontFamily: 'Kreon-Regular',
    textAlign: 'center',
    color: '#6f634f',
  },
  progressContainer: {
    marginBottom: hp(2),
    alignItems: 'center',
  },
  progressBar: {
    width: wp(60),
    height: 4,
    backgroundColor: '#f1dea9',
    borderRadius: 2,
    marginBottom: hp(1),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#b2ffe2',
    borderRadius: 2,
  },
  progressText: {
    fontSize: getFontSize(14),
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameSection: {
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: getFontSize(18),
    fontFamily: 'Kreon-Bold',
    color: '#000',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  nameInput: {
    backgroundColor: '#f1dea9',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: 12,
    fontSize: getFontSize(16),
    fontFamily: 'Kreon-Regular',
    color: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    textAlign: 'center',
  },
  capabilitiesSection: {
    flex: 1,
    marginBottom: hp(2),
  },
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    flex: 1,
  },
  capabilityCard: {
    backgroundColor: '#f1dea9',
    width: wp(42),
    padding: wp(3),
    borderRadius: 12,
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: hp(12),
    justifyContent: 'center',
  },
  selectedCapabilityCard: {
    backgroundColor: '#b2ffe2',
  },
  capabilityContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6f634f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
    backgroundColor: '#fff',
  },
  checkedBox: {
    backgroundColor: '#b2ffe2',
    borderColor: '#2d5016',
    shadowColor: '#2d5016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  innerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2d5016',
  },
  capabilityTitle: {
    fontSize: getFontSize(14),
    fontFamily: 'Kreon-Bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: hp(0.5),
  },
  selectedCapabilityTitle: {
    color: '#000',
  },
  capabilityDescription: {
    fontSize: getFontSize(11),
    fontFamily: 'Kreon-Regular',
    color: '#6f634f',
    textAlign: 'center',
    lineHeight: getFontSize(15),
  },
  selectedCapabilityDescription: {
    color: '#2d5016',
  },
  setupButton: {
    backgroundColor: '#e8dcc0',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: hp(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  setupButtonActive: {
    backgroundColor: '#a4c3b2',
  },
  setupButtonText: {
    fontSize: getFontSize(16),
    fontFamily: 'Kreon-Bold',
    color: '#6f634f',
  },
  setupButtonTextActive: {
    color: '#000',
  },
  bottomIndicator: {
    width: Math.min(wp(35), 150),
    height: hp(0.6),
    minHeight: 4,
    maxHeight: 8,
    backgroundColor: '#f1dea9',
    borderRadius: hp(0.3),
    alignSelf: 'center',
    marginBottom: hp(1.2),
  },
});

export default AISetup;

