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
import { CountryPicker } from 'react-native-country-codes-picker';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase'; // ✅ Make sure you have this file

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

const Login = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleContinue = async () => {
    const fullPhone = `${countryCode}${phone}`;

    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

    if (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to send OTP. Try again.');
      return;
    }

    // Navigate to OTP screen with phone number as param
    router.push({
      pathname: '/otp',
      params: { phone: fullPhone }
    });
    
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
              <View style={[styles.stepLine, styles.active]} />
              <View style={[styles.stepLine, styles.dimmed]} />
            </View>

            <Text style={styles.heading}>Login or Sign Up</Text>
            <Text style={styles.subText}>Enter your mobile number to proceed</Text>

            <View style={styles.phoneContainer}>
              <TouchableOpacity onPress={() => setShowPicker(true)}>
                <Text style={styles.countryCode}>{countryCode}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.phoneInput}
                placeholder="XXXXXXXXXX"
                placeholderTextColor="#5c5340"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <View style={styles.underline} />
          </View>

          <CountryPicker
            show={showPicker}
            lang="en"
            pickerButtonOnPress={(item) => {
              setCountryCode(item.dial_code);
              setShowPicker(false);
            }}
            onBackdropPress={() => setShowPicker(false)}
          />

          <View style={styles.bottom}>
            <Text style={styles.terms}>
              By Clicking , I accept the{' '}
              <Text style={styles.link}>terms & conditions</Text> &{' '}
              <Text style={styles.link}>privacy policy</Text>
            </Text>

            <TouchableOpacity onPress={handleContinue} style={styles.button}>
              <Text style={styles.buttonText}>Continue</Text>
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
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
    marginBottom: hp(5), // 5% of screen height instead of fixed 40
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.6), // 0.6% of screen height instead of fixed 5
    paddingVertical: hp(1), // Add vertical padding for better touch area
  },
  countryCode: {
    fontSize: getFontSize(22),
    fontFamily: 'Kreon-SemiBold',
    color: '#000',
    marginRight: wp(2.5), // 2.5% of screen width instead of fixed 10
    minWidth: wp(12), // Ensure consistent width for country code
    paddingVertical: hp(1), // Better touch area
    paddingHorizontal: wp(2), // Better touch area
  },
  phoneInput: {
    flex: 1,
    fontSize: getFontSize(22),
    color: '#5c5340',
    fontFamily: 'Kreon-Regular',
    letterSpacing: wp(0.3), // 0.3% of screen width instead of fixed 1
    paddingVertical: hp(1), // Better touch area
    minHeight: hp(6), // Ensure minimum touch area
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
    color: '#6f634f',
    fontFamily: 'Kreon-Regular',
    fontSize: getFontSize(14), // Added responsive font size
    marginBottom: hp(2.5), // 2.5% of screen height instead of fixed 20
    lineHeight: getFontSize(18), // Added responsive line height
    paddingHorizontal: wp(2), // Add horizontal padding for better readability
  },
  link: {
    color: '#000',
    fontFamily: 'Kreon-SemiBold'
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
    fontFamily: 'Kreon-Bold',  
    color: '#000',
  },
});

export default Login;