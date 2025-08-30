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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';

// const CLIENT_ID = '848784416430-8861cecc0rk7t5on72hgakrpgvv2jkqg.apps.googleusercontent.com';
// const CLIENT_SECRET = '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';
// const REDIRECT_URI = AuthSession.makeRedirectUri({
//   // Use your custom scheme if needed
//   useProxy: true,
// });
const REDIRECT_URI='https://auth.expo.io/@dhaneshvaibhav/AdjunctApp'
const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify'];



const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function Settings() {
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();

  // AuthSession useAuthRequest hook
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: SCOPES,
      responseType: 'code',
      extraParams: {
        access_type: 'offline', // important to get refresh token
        prompt: 'consent', // force showing consent screen
      },
    },
    discovery
  );

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

  useEffect(() => {
    console.log('Auth request:', request);
  }, [request]);
  // ---- INSIDE useEffect for OAuth response ----
useEffect(() => {
  console.log('OAuth response:', response);
  if (response?.type === 'success' && response.params.code) {
    console.log('✅ Received code:', response.params.code);
    exchangeCodeForTokens(response.params.code);
  } else if (response) {
    console.log('OAuth did not return code:', response);
    Alert.alert('OAuth issue', `Type: ${response.type}`);
  }
}, [response]);


  // Exchange authorization code for tokens
  // ---- Token exchange logic ----
const exchangeCodeForTokens = async (code: string) => {
  setLoading(true);
  try {
    console.log('🔄 Exchanging code for tokens...');
    const tokenResponse = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenResult = await tokenResponse.json();
    console.log('🧾 Token exchange result:', tokenResult);

    if (tokenResult.error) {
      throw new Error(tokenResult.error_description || 'Failed to get tokens');
    }

    const { access_token, refresh_token } = tokenResult;
    console.log('✅ Access Token:', access_token);
    console.log('✅ Refresh Token:', refresh_token);

    // Save tokens to Supabase based on phone number
    const { error } = await supabase
      .from('profiles')
      .update({
        google_access_token: access_token,
        google_refresh_token: refresh_token,
      })
      .eq('phone_number', phoneNumber);

    if (error) throw error;

    console.log('✅ Tokens successfully saved to Supabase for phone:', phoneNumber);
    Alert.alert('Success', 'Google tokens saved successfully!');
  } catch (error) {
    console.error('❌ Token exchange error:', error);
    Alert.alert('Error', 'Failed to save Google tokens');
  } finally {
    setLoading(false);
  }
};

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
      router.push('/home/chats');
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
      await AsyncStorage.clear();
      Alert.alert('Logged out', 'You have been logged out.');
      router.push('/onboard');
    } catch (err) {
      Alert.alert('❌ Error', 'Logout failed');
      console.error(err);
    }
  };

  const handleGoogleOAuth = () => {
    if (request) {
      promptAsync();
    } else {
      Alert.alert('Error', 'Google OAuth request not ready');
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
            onPress={handleGoogleOAuth}
            disabled={!request || loading}
          >
            <AntDesign
              name="google"
              size={20}
              color="#EA4335"
              style={{ marginRight: 8 }}
            />
            {loading ? (
              <ActivityIndicator color="#EA4335" />
            ) : (
              <Text style={styles.googleButtonText}>Connect with Google</Text>
            )}
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
