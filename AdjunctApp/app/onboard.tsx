import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';

const OnboardingScreen = () => {
  const [currentPage, setCurrentPage] = useState(0); // 0, 1, 2 for three pages

  const handleGetStarted = () => {
    // Handle get started button press
    console.log('Get Started pressed');
  };

  const renderPageIndicators = () => {
    return (
      <View style={styles.indicatorContainer}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentPage === index ? styles.activeIndicator : styles.inactiveIndicator
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#DCD0A8" />
      
      {/* Header with App Name */}
      <View style={styles.header}>
        <Text style={styles.appName}>Adjunct</Text>
      </View>

      {/* Page Indicators */}
      {renderPageIndicators()}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>
          Human Intelligence.{'\n'}
          AI Precision{'\n'}
          Perfectly Fused
        </Text>

        {/* Illustration Container */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={require('../assets/images/WhatsApp_Image_2025-08-06_at_23.25.55_751d3ed6-removebg-preview.png')} 
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Human + AI —{'\n'}
          fused with trust,{'\n'}
          powered by consent.
        </Text>
      </View>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      {/* Bottom Indicator */}
      <View style={styles.bottomIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DCD0A8',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
    letterSpacing: 0.5,
    fontFamily: 'Kreon',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
  },
  indicator: {
    height: 3,
    width: 40,
    borderRadius: 1.5,
  },
  activeIndicator: {
    backgroundColor: '#2C2C2C',
  },
  inactiveIndicator: {
    backgroundColor: '#D4D4D4',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C2C2C',
    textAlign: 'left',
    lineHeight: 40,
    marginBottom: 60,
    alignSelf: 'stretch',
    fontFamily: 'Kreon',
  },
  illustrationContainer: {
    backgroundColor: 'transparent',
    height: 200,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  illustrationImage: {
    width: 350,
    height: 350,
    backgroundColor: 'transparent',
  },
  subtitle: {
    fontSize: 16,
    color: '#2C2C2C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    fontFamily: 'Kreon',
  },
  getStartedButton: {
    backgroundColor: '#B2ECD4',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    fontFamily: 'Kreon',
  },
  arrow: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  bottomIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#DCD0A8',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 10,
  },
});

export default OnboardingScreen;