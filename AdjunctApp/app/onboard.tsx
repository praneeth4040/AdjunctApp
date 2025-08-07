import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const OnboardingScreen = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleGetStarted = () => {
    console.log('Get Started pressed');
    router.push('/Login');
  };
// ✅ Import



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
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
    fontFamily:'Kreon-Bold'
  },
  title: {
    fontSize: 24,
    fontFamily:'Kreon-Bold',
    textAlign: 'center',
    color: '#000',
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 10,
  },
  stepLine: {
    height: 2,
    width: 40,
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
    paddingTop: 20,
  },
  heading: {
    fontSize: 32,
    color: '#000',
    textAlign: 'left',
    lineHeight: 40,
    marginBottom: 75,
    alignSelf: 'stretch',
    fontFamily: 'Kreon-Bold', // Or 'Kreon'
  },
  illustrationContainer: {
    backgroundColor: 'transparent',
    height: 200,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  illustrationImage: {
    width: 350,
    height: 350,
  },
  subText: {
    fontSize: 16,
    color: '#6f634f',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Kreon-Regular', // Or 'Kreon'
  },
  button: {
    backgroundColor: '#b2ffe2',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  buttonText: {
    fontSize: 24,
    color: '#000',
    fontFamily: 'Kreon-Bold', // Or 'Kreon'
  },
  arrow: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  bottomIndicator: {
    width: 134,
    height: 5,
    backgroundColor: '#f1dea9',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 10,
  },
});

export default OnboardingScreen;
