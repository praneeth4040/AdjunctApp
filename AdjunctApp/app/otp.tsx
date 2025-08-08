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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase'

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
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    marginBottom: 10,
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
  heading: {
    fontSize: 32,
    fontFamily: 'Kreon-Bold',
    textAlign: 'left',
    color: '#000',
  },
  subText: {
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
    color: '#6f634f',
    marginBottom: 40,
  },
  otpInput: {
    fontSize: 22,
    fontFamily: 'Kreon-Regular',
    color: '#5c5340',
    fontWeight: '600',
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 10,
  },
  underline: {
    height: 1,
    backgroundColor: '#000',
    marginBottom: 30,
  },
  bottom: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 20,
  },
  terms: {
    textAlign: 'center',
    fontFamily: 'Kreon-Regular',
    color: '#6f634f',
    marginBottom: 20,
  },
  link: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'Kreon-Regular',
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
    width: '100%',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 24,
    color: '#000',
    fontFamily: 'Kreon-Bold',
  },
});

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
      router.push({
        pathname: '/home',
        params: { phone: phone },
      });// or your main app screen
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

export default OTPVerification;
