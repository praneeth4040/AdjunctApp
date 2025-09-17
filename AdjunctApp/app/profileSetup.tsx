// Polyfill must be at the very top
import 'react-native-get-random-values';

import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Image, 
  StyleSheet,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import { getOrCreateKeys } from '../lib/encrypt'; // key generation

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

export default function ProfileSetup() {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        Alert.alert('Error', 'Could not fetch user info');
        return;
      }
      if (user.phone) setPhoneNumber(user.phone);
    };
    fetchUser();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setProfileImage(manipulatedImage.uri);
      setBase64Data(manipulatedImage.base64 || null);
    }
  };

  const handleConfirm = async () => {
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Error', 'User not authenticated');
      setIsLoading(false);
      return;
    }

    let uploadedImageUrl: string | null = null;

    // Upload profile image if available
    if (base64Data) {
      try {
        const fileName = `${user.id}_${Date.now()}.jpg`;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) =>
          byteCharacters.charCodeAt(i)
        );
        const byteArray = new Uint8Array(byteNumbers);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, byteArray, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        uploadedImageUrl = data.publicUrl;

      } catch (e: any) {
        console.error('Image upload exception:', e);
        Alert.alert('Upload Error', e.message || 'Something went wrong while uploading image');
        setIsLoading(false);
        return;
      }
    }

    try {
      // 1️⃣ Generate key pair (secure PRNG now available)
      const { publicKeyBase64 } = await getOrCreateKeys(phoneNumber);

      // 2️⃣ Upsert profile details including public key
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          phone_number: phoneNumber,
          name: username,
          profile_picture: uploadedImageUrl,
          public_key: publicKeyBase64,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      Alert.alert('Success', 'Profile created successfully!', [
        { text: 'Continue', onPress: () => router.replace('/aisetup') }
      ]);

    } catch (err: any) {
      console.error('Profile setup failed:', err);
      Alert.alert('Setup Error', err.message || 'Something went wrong during profile setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>Adjunct</Text>
            <Text style={styles.pageTitle}>Profile Setup</Text>
            <Text style={styles.subtitle}>Complete your profile to get started</Text>
          </View>

          {/* Main Content Card */}
          <View style={styles.contentCard}>
            {/* Profile Image Section */}
            <View style={styles.imageSection}>
              <View style={styles.imageContainer}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="person" size={wp(20)} color="#666" />
                  </View>
                )}
                
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.editButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={wp(5)} color="#4A90E2" />
                </TouchableOpacity>
              </View>
              <Text style={styles.imageHint}>Tap to add profile picture</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Phone Number (Read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneInputContainer}>
                  <Ionicons name="call" size={wp(5)} color="#666" style={styles.inputIcon} />
                  <Text style={styles.phoneText}>{phoneNumber}</Text>
                </View>
              </View>

              {/* Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={wp(5)} color="#666" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    style={styles.textInput}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>
              </View>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Text style={styles.buttonText}>Creating Profile...</Text>
              ) : (
                <>
                  <Text style={styles.buttonText}>Complete Setup</Text>
                  <Ionicons name="arrow-forward" size={wp(5)} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#DCD0A8',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: hp(2),
  },
  header: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  appTitle: {
    fontFamily: 'Kreon-Bold',
    fontSize: getFontSize(24),
    color: '#000',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  pageTitle: {
    fontFamily: 'Kreon-Bold',
    fontSize: getFontSize(32),
    color: '#000',
    textAlign: 'center',
    marginBottom: hp(0.5),
  },
  subtitle: {
    fontFamily: 'Kreon-Regular',
    fontSize: getFontSize(16),
    color: '#6f634f',
    textAlign: 'center',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#F8F6F0',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: wp(6),
    paddingTop: hp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: hp(4),
  },
  imageContainer: {
    position: 'relative',
    marginBottom: hp(1),
  },
  profileImage: {
    width: wp(35),
    height: wp(35),
    borderRadius: wp(17.5),
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  placeholderImage: {
    width: wp(35),
    height: wp(35),
    borderRadius: wp(17.5),
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  editButton: {
    position: 'absolute',
    bottom: wp(1),
    right: wp(1),
    backgroundColor: '#FFFFFF',
    borderRadius: wp(6),
    width: wp(12),
    height: wp(12),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  imageHint: {
    fontFamily: 'Kreon-Regular',
    fontSize: getFontSize(14),
    color: '#888',
    textAlign: 'center',
  },
  formSection: {
    marginBottom: hp(4),
  },
  inputGroup: {
    marginBottom: hp(3),
  },
  inputLabel: {
    fontFamily: 'Kreon-SemiBold',
    fontSize: getFontSize(16),
    color: '#333',
    marginBottom: hp(1),
    marginLeft: wp(1),
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E4D6',
    borderRadius: 16,
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    borderWidth: 1,
    borderColor: '#D0C8B0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: wp(3),
  },
  phoneText: {
    flex: 1,
    fontFamily: 'Kreon-Regular',
    fontSize: getFontSize(16),
    color: '#666',
  },
  textInput: {
    flex: 1,
    fontFamily: 'Kreon-Regular',
    fontSize: getFontSize(16),
    color: '#333',
    paddingVertical: 0, // Remove default padding
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(2),
    borderRadius: 16,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: hp(2),
    gap: wp(2),
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
    shadowOpacity: 0.1,
  },
  buttonText: {
    fontFamily: 'Kreon-Bold',
    fontSize: getFontSize(18),
    color: '#FFFFFF',
  },
});