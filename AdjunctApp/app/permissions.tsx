import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet,Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as MediaLibrary from 'expo-media-library';
import { Camera } from 'expo-camera';
import * as AV from 'expo-av';

const PermissionsScreen = () => {
  const [permissions, setPermissions] = useState({
    contacts: false,
    location: false,
    microphone: false,
    storage: false,
    camera: false,
  });

  const requestAllPermissions = async () => {
    try {
      const [contactsStatus, locationStatus, micStatus, storageStatus, cameraStatus] =
        await Promise.all([
          Contacts.requestPermissionsAsync(),
          Location.requestForegroundPermissionsAsync(),
          AV.Audio.requestPermissionsAsync(),
          MediaLibrary.requestPermissionsAsync(),
          Camera.requestCameraPermissionsAsync(),
        ]);

      const granted = {
        contacts: contactsStatus.status === 'granted',
        location: locationStatus.status === 'granted',
        microphone: micStatus.status === 'granted',
        storage: storageStatus.status === 'granted',
        camera: cameraStatus.status === 'granted',
      };

      setPermissions(granted);
      const allGranted = Object.values(granted).every((val)=>val===true);
      if(allGranted){
        Alert.alert('Permissions',"All permissions are granted successfully")
      }
    } catch (err) {
      console.error('Permission error:', err);
    }
  };

  const permissionCards = [
    { key: 'contacts', emoji: '👥', title: 'Allow Contacts', subtitle: 'Invite friends & sync chats.' },
    { key: 'location', emoji: '📍', title: 'Allow Location', subtitle: 'Personalize based on area.' },
    { key: 'microphone', emoji: '🎤', title: 'Allow Mic', subtitle: 'Use voice input features.' },
    { key: 'storage', emoji: '📁', title: 'Allow Storage', subtitle: 'Upload and share files.' },
    { key: 'camera', emoji: '📷', title: 'Allow Camera', subtitle: 'Scan or capture media.' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.header}>Adjunct</Text>
        <Text style={styles.title}>Let’s Setup Your Experience</Text>
        <Text style={styles.description}>
          To personalize your experience, we just need access to a few things — always with your consent.
        </Text>

        {permissionCards.map((item) => (
          <View style={styles.card} key={item.key}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.button} onPress={requestAllPermissions}>
          <Text style={styles.buttonText}>Allow Permissions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5d4a1',
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40, // optional: push slightly up for balance
  },
  header: {
    fontSize: 20,
    fontFamily: 'Kreon-Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Kreon-Bold',
    textAlign: 'left',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Kreon',
    color: '#444',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf6e3',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  emoji: {
    fontSize: 24,
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Kreon',
    color: '#444',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#baf4d1',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'Kreon-Bold',
    color: 'black',
  },
});

export default PermissionsScreen;
