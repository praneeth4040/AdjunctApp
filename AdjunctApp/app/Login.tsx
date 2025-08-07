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
import { CountryPicker } from 'react-native-country-codes-picker';
import { useRouter } from 'expo-router';
// import { supabase } from '../lib/supabase'; // ✅ Make sure you have this file

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
    fontFamily:'Kreon-Bold',
    textAlign: 'left',
    color: '#000',
  },
  subText: {
    fontSize: 16,
    color: '#6f634f',
    fontFamily:'Kreon-Regular',
    marginBottom: 40,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  countryCode: {
    fontSize: 22,
    fontFamily:'Kreon-SemiBold',
    color: '#000',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 22,
    color: '#5c5340',
    fontFamily:'Kreon-Regular',
    letterSpacing: 1,
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
    color: '#6f634f',
    fontFamily:'Kreon-Regular',
    marginBottom: 20,
  },
  link: {
    color: '#000',
    fontFamily:'Kreon-SemiBold'
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
    fontFamily:'Kreon-Bold',  
    color: '#000',
  },
});

const Login = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleContinue = async () => {
    const fullPhone = `${countryCode}${phone}`;

    // const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

    // if (error) {
    //   console.log(error);
    //   Alert.alert('Error', 'Failed to send OTP. Try again.');
    //   return;
    // }

    // Navigate to OTP screen with phone number as param
    router.push({ pathname: '/otp', params: { phone: fullPhone } });
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

export default Login;
