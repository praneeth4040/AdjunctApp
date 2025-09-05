import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

const OnboardingScreen = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleGetStarted = () => {
    console.log('Get Started pressed');
    router.push('/Login');
  };

  const renderPageIndicators = () => (
    <View style={styles.stepContainer}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.stepLine,
            currentPage === index ? styles.active : styles.dimmed
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1dea9" />

      {/* App Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Adjunct</Text>
      </View>

      {/* Steps */}
      {renderPageIndicators()}

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.heading}>
          Human Intelligence.{'\n'}
          AI Precision{'\n'}
          Perfectly Fused
        </Text>

        <View style={styles.illustrationContainer}>
          <Image 
            source={require('../assets/images/WhatsApp_Image_2025-08-06_at_23.25.55_751d3ed6-removebg-preview.png')} 
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.subText}>
          Human + AI —{'\n'}
          fused with trust,{'\n'}
          powered by consent.
        </Text>
      </View>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.bottomIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#dcd0a8',
    paddingHorizontal: wp(5), // 5% of screen width
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(1.5), // 1.5% of screen height
    fontFamily: 'Kreon-Bold'
  },
  title: {
    fontSize: getFontSize(24),
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    color: '#000',
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: hp(4), // 4% of screen height
    gap: wp(2.5), // 2.5% of screen width
  },
  stepLine: {
    height: 2,
    width: wp(10), // 10% of screen width
    borderRadius: 2,
  },
  active: {
    backgroundColor: '#000',
  },
  dimmed: {
    backgroundColor: '#aaa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: hp(2.5), // 2.5% of screen height
  },
  heading: {
    fontSize: getFontSize(32),
    color: '#000',
    textAlign: 'left',
    lineHeight: getFontSize(40),
    marginBottom: hp(9), // 9% of screen height instead of fixed 75
    alignSelf: 'stretch',
    fontFamily: 'Kreon-Bold',
  },
  illustrationContainer: {
    backgroundColor: 'transparent',
    height: hp(25), // 25% of screen height
    width: wp(50), // 50% of screen width
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(6), // 6% of screen height
  },
  illustrationImage: {
    width: '100%', // Fill container width
    height: '100%', // Fill container height
    maxWidth: wp(85), // Maximum 85% of screen width
    maxHeight: hp(30), // Maximum 30% of screen height
  },
  subText: {
    fontSize: getFontSize(16),
    color: '#6f634f',
    textAlign: 'center',
    lineHeight: getFontSize(22),
    fontFamily: 'Kreon-Regular',
  },
  button: {
    backgroundColor: '#b2ffe2',
    paddingVertical: hp(2), // 2% of screen height
    paddingHorizontal: wp(8), // 8% of screen width
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2.5), // 2.5% of screen height
    gap: wp(2.5), // 2.5% of screen width
  },
  buttonText: {
    fontSize: getFontSize(24),
    color: '#000',
    fontFamily: 'Kreon-Bold',
  },
  arrow: {
    fontSize: getFontSize(24),
    fontWeight: 'bold',
    color: '#000',
  },
  bottomIndicator: {
    width: wp(35), // 35% of screen width instead of fixed 134
    height: 5,
    backgroundColor: '#f1dea9',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: hp(1.2), // 1.2% of screen height
  },
});

export default OnboardingScreen;