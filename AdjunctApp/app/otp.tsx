import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

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

const OTPVerification = () => {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const router = useRouter();
  const { phone } = useLocalSearchParams(); // phone comes from login screen

  const handleVerify = async () => {
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone as string,
      token: otp,
      type: 'sms',
    });

    if (error) {
      console.error('OTP Verification Error:', error);
      Alert.alert('Verification Failed', error.message);
    } else {
      console.log('OTP verified. User session:', data);
      router.replace('/permissions'); // or your main app screen
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.title}>Adjunct</Text>
            <View style={styles.stepContainer}>
              <View style={[styles.stepLine, styles.dimmed]} />
              <View style={[styles.stepLine, styles.dimmed]} />
              <View style={[styles.stepLine, styles.active]} />
            </View>

            <Text style={styles.heading}>OTP Verification</Text>
            <Text style={styles.subText}>Enter the 6-digit OTP sent to your number</Text>

            <TextInput
              style={styles.otpInput}
              placeholder="------"
              placeholderTextColor="#5c5340"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <View style={styles.underline} />
          </View>

          <View style={styles.bottom}>
            <Text style={styles.terms}>
              By Clicking, I accept the{' '}
              <Text style={styles.link}>terms & conditions</Text> &{' '}
              <Text style={styles.link}>privacy policy</Text>
            </Text>

            <TouchableOpacity onPress={handleVerify} style={styles.button}>
              <Text style={styles.buttonText}>Get Verified</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#DCD0A8',
  },
  container: {
    flex: 1,
    backgroundColor: '#DCD0A8',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: wp(8), // 8% of screen width instead of fixed 30
    paddingTop: hp(7), // 7% of screen height instead of fixed 60
  },
  title: {
    fontSize: getFontSize(24),
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    marginBottom: hp(1.2), // 1.2% of screen height instead of fixed 10
    color: '#000',
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: hp(3.5), // 3.5% of screen height instead of fixed 30
    gap: wp(2.5), // 2.5% of screen width instead of fixed 10
  },
  stepLine: {
    height: 2,
    width: wp(10), // 10% of screen width instead of fixed 40
    borderRadius: 2,
  },
  active: {
    backgroundColor: '#000',
  },
  dimmed: {
    backgroundColor: '#aaa',
  },
  heading: {
    fontSize: getFontSize(32),
    fontFamily: 'Kreon-Bold',
    textAlign: 'left',
    color: '#000',
  },
  subText: {
    fontSize: getFontSize(16),
    fontFamily: 'Kreon-Bold',
    color: '#6f634f',
    marginBottom: hp(5), // 5% of screen height instead of fixed 40
  },
  otpInput: {
    fontSize: getFontSize(22),
    fontFamily: 'Kreon-Regular',
    color: '#5c5340',
    fontWeight: '600',
    letterSpacing: wp(2.5), // 2.5% of screen width instead of fixed 10
    textAlign: 'center',
    marginBottom: hp(1.2), // 1.2% of screen height instead of fixed 10
    paddingVertical: hp(1), // Add some vertical padding for better touch area
  },
  underline: {
    height: 1,
    backgroundColor: '#000',
    marginBottom: hp(3.5), // 3.5% of screen height instead of fixed 30
  },
  bottom: {
    marginTop: hp(5), // 5% of screen height instead of fixed 40
    alignItems: 'center',
    paddingBottom: hp(2.5), // 2.5% of screen height instead of fixed 20
  },
  terms: {
    textAlign: 'center',
    fontFamily: 'Kreon-Regular',
    fontSize: getFontSize(14), // Added responsive font size
    color: '#6f634f',
    marginBottom: hp(2.5), // 2.5% of screen height instead of fixed 20
    lineHeight: getFontSize(18), // Added responsive line height
    paddingHorizontal: wp(2), // Add horizontal padding for better readability
  },
  link: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'Kreon-Regular',
  },
  button: {
    backgroundColor: '#b2ffe2',
    paddingVertical: hp(1.8), // 1.8% of screen height instead of fixed 14
    paddingHorizontal: wp(8), // 8% of screen width instead of fixed 30
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: '100%',
    minHeight: hp(6), // Ensure minimum touch area
  },
  buttonText: {
    textAlign: 'center',
    fontSize: getFontSize(24),
    color: '#000',
    fontFamily: 'Kreon-Bold',
  },
});

export default OTPVerification;