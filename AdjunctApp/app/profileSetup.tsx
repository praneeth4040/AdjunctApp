import { View, Text, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileSetup() {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const registeredNumber = '+91-XXXXXXXXXX'; // Replace with dynamic number from auth

  // 📸 Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ✅ Confirm button pressed
  const handleConfirm = () => {
    if (!username.trim()) {
      Alert.alert('Please enter your name');
      return;
    }

    // Later: save to DB
    Alert.alert('Success', 'Your profile has been saved successfully!');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#e6dbb9' }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: 'Kreon-Regular', fontSize: 20, textAlign: 'center' }}>Adjunct</Text>
        <Text style={{ fontFamily: 'Kreon-Bold', fontSize: 32, marginTop: 10 }}>Profile SetUp</Text>
      </View>

      {/* Content Box */}
      <View
        style={{
          flex: 1,
          marginTop: 24,
          backgroundColor: '#f8f3dd',
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          paddingHorizontal: 24,
          paddingTop: 40,
          alignItems: 'center',
        }}
      >
        {/* Profile Image with preview */}
        <View
          style={{
            backgroundColor: '#d9f0ea',
            borderRadius: 20,
            width: 280,
            height: 240,
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: 280, height: 240, resizeMode: 'cover' }}
            />
          ) : (
            <Ionicons name="person" size={96} color="black" />
          )}

          <TouchableOpacity
            onPress={pickImage}
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              backgroundColor: '#f8f3dd',
              borderRadius: 8,
              padding: 4,
            }}
          >
            <Ionicons name="create-outline" size={20} color="black" />
          </TouchableOpacity>
        </View>

        {/* Registered number */}
        <View
          style={{
            marginTop: 20,
            backgroundColor: '#d8cea3',
            width: '100%',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: 'Kreon-Regular',
              color: '#000',
            }}
          >
            {registeredNumber}
          </Text>
        </View>

        {/* Username input */}
        <TextInput
          placeholder="Enter username"
          placeholderTextColor="#000"
          value={username}
          onChangeText={setUsername}
          style={{
            marginTop: 28,
            backgroundColor: '#d8cea3',
            width: '100%',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 20,
            fontSize: 18,
            fontFamily: 'Kreon-Regular',
          }}
        />

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleConfirm}
          style={{
            marginTop: 32,
            backgroundColor: '#000',
            paddingVertical: 14,
            paddingHorizontal: 40,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 18,
              fontFamily: 'Kreon-SemiBold',
            }}
          >
            Confirm
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
