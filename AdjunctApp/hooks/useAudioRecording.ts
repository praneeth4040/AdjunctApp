import { useState, useRef, useCallback } from 'react';
import { Alert, Animated } from 'react-native';
import { Audio } from 'expo-av';

export const useAudioRecording = (
  onAudioUploaded: (url: string, fileName: string) => void
) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState<{[key: string]: boolean}>({});
  const recordingTimer = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startRecording = useCallback(async () => {
    try {
      console.log("🎙️ Starting recording...");
  
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required");
        return;
      }
  
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 0,
        interruptionModeAndroid: 1,
      });
  
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
  
      setRecording(recording);
      setRecordingDuration(0);
      startPulseAnimation();
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000) as unknown as number;
      
      console.log("✅ Recording started");
    } catch (err) {
      console.error("startRecording error:", err);
    }
  }, []);

  const stopRecording = useCallback(async (uploadFileToSupabase: (uri: string, fileName: string, mimeType: string) => Promise<string>) => {
    if (!recording) return;
    
    stopPulseAnimation();
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setRecordingDuration(0);
  
    if (uri) {
      const fileName = `audio-${Date.now()}.m4a`;
      try {
        const url = await uploadFileToSupabase(uri, fileName, "audio/m4a");
        onAudioUploaded(url, fileName);
      } catch (err: any) {
        Alert.alert("Upload Failed", err.message || "Error uploading audio");
      }
    }
  }, [recording, onAudioUploaded]);

  const playAudio = useCallback(async (uri: string, messageId: string) => {
    try {
      setIsPlaying(prev => ({...prev, [messageId]: true}));
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(prev => ({...prev, [messageId]: false}));
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(prev => ({...prev, [messageId]: false}));
    }
  }, []);

  return {
    recording,
    recordingDuration,
    isPlaying,
    pulseAnim,
    startRecording,
    stopRecording,
    playAudio,
  };
};
