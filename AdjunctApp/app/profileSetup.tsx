// Polyfill must be at the very top
import 'react-native-get-random-values';

import { View, Text, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import { getOrCreateKeys } from '../lib/encrypt'; // key generation

export default function ProfileSetup() {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);

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
      Alert.alert('Please enter your name');
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Error', 'User not authenticated');
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
        Alert.alert('Error', e.message || 'Something went wrong while uploading image');
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

      Alert.alert('Success', 'Profile updated!');
      router.replace('/home/chats');

    } catch (err: any) {
      console.error('Profile setup failed:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#e6dbb9' }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: 'Kreon-Regular', fontSize: 20, textAlign: 'center' }}>Adjunct</Text>
        <Text style={{ fontFamily: 'Kreon-Bold', fontSize: 32, marginTop: 10 }}>Profile SetUp</Text>
      </View>

      <View style={{
        flex: 1,
        marginTop: 24,
        backgroundColor: '#f8f3dd',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: '#d9f0ea',
          borderRadius: 20,
          width: 200,
          height: 200,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{ width: 120, height: 120, borderRadius: 60, resizeMode: 'cover' }}
            />
          ) : (
            <Ionicons name="person" size={96} color="black" />
          )}

          <TouchableOpacity
            onPress={pickImage}
            style={{ position: 'absolute', bottom: 16, right: 16, backgroundColor: '#f8f3dd', borderRadius: 8, padding: 4 }}>
            <Ionicons name="create-outline" size={20} color="black" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 20, backgroundColor: '#d8cea3', width: '100%', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 20 }}>
          <Text style={{ fontSize: 16, fontFamily: 'Kreon-Regular', color: '#000' }}>{phoneNumber}</Text>
        </View>

        <TextInput
          placeholder="Enter username"
          placeholderTextColor="#000"
          value={username}
          onChangeText={setUsername}
          style={{ marginTop: 28, backgroundColor: '#d8cea3', width: '100%', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 20, fontSize: 18, fontFamily: 'Kreon-Regular' }}
        />

        <TouchableOpacity
          onPress={handleConfirm}
          style={{ marginTop: 32, backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 20 }}>
          <Text style={{ color: 'white', fontSize: 18, fontFamily: 'Kreon-SemiBold' }}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
