import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';

function Settings() {
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('name,profile_picture,phone_number')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;

        setUserName(data?.name || 'User');
        setProfilePicture(data?.profile_picture || '');
        setPhoneNumber(data?.phone_number || '');
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };
    fetchUser();
  }, []);

  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
  
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      // Convert base64 -> ArrayBuffer
      const binary = atob(base64);
      const arrayBuffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        arrayBuffer[i] = binary.charCodeAt(i);
      }
  
      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });
  
      if (uploadError) throw uploadError;
  
      const { data: publicURLData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
  
      return publicURLData.publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      return null;
    }
  };
  
  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let uploadedURL = profilePicture;
      if (profilePicture && profilePicture.startsWith('file://')) {
        const uploaded = await uploadImageToSupabase(profilePicture);
        if (uploaded) uploadedURL = uploaded;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ name: userName, profile_picture: uploadedURL })
        .eq('user_id', userId);

      if (error) throw error;
      Alert.alert('✅ Success', 'Profile updated!');
      router.push('/home/chats')
      setEditing(false);
    } catch (err) {
      Alert.alert('❌ Error', 'Failed to update profile');
      console.error(err);
    }
    setLoading(false);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      Alert.alert('👋 Logged out', 'You have been signed out.');
    } catch (err) {
      Alert.alert('❌ Error', 'Logout failed');
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity
            onPress={editing ? handlePickImage : undefined}
            style={styles.imageWrapper}
          >
            <Image
              source={{ uri: profilePicture || 'https://via.placeholder.com/150' }}
              style={styles.profileImage}
            />
            {editing && (
              <View style={styles.editIcon}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {editing ? (
            <TextInput
              value={userName}
              onChangeText={setUserName}
              placeholder="Your Name"
              style={styles.nameInput}
              autoFocus
            />
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{userName}</Text>
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Ionicons
                  name="pencil"
                  size={18}
                  color="#4A5568"
                  style={styles.pencilIcon}
                />
              </TouchableOpacity>
            </View>
          )}

          {phoneNumber ? <Text style={styles.phoneText}>{phoneNumber}</Text> : null}

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() =>
              Alert.alert('Coming soon', 'Google authentication will be available soon!')
            }
          >
            <AntDesign
              name="google"
              size={20}
              color="#EA4335"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.googleButtonText}>Connect with Google</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.primaryButton, !editing && styles.disabledButton]}
              onPress={handleSave}
              disabled={!editing || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#DCD0A8',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#eee',
  },
  editIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pencilIcon: {
    marginLeft: 6,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  phoneText: {
    fontSize: 15,
    color: '#777',
    marginBottom: 16,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 6,
    marginBottom: 10,
    textAlign: 'center',
    minWidth: 160,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#EA4335',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Settings;
