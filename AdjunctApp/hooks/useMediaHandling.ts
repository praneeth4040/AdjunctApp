import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

export const useMediaHandling = (
  senderPhone: string,
  receiverPhone: string,
  privacyMode: boolean
) => {
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const uploadFileToSupabase = async (uri: string, fileName: string, mimeType: string) => {
    setUploadingMedia(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    
      const filePath = `${Date.now()}-${fileName}`;
    
      const { data, error } = await supabase.storage
        .from("chat-files")
        .upload(filePath, decode(base64), {
          contentType: mimeType,
          upsert: true,
        });
    
      if (error) throw error;
    
      const { data: publicUrlData } = supabase.storage
        .from("chat-files")
        .getPublicUrl(filePath);
    
      return publicUrlData.publicUrl;
    } finally {
      setUploadingMedia(false);
    }
  };
  
  const decode = (base64: string) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const insertMediaMessage = async (
    media_url: string,
    media_type: "image" | "video" | "document" | "audio",
    file_name?: string,
  ) => {
    if (!senderPhone || !receiverPhone) return;
  
    try {
      const { error } = await supabase.from("messages").insert({
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
        message: "",
        media_url,
        media_type,
        file_name,
        is_read: false,
        mode: privacyMode ? "privacy" : "compatibility",
      });
  
      if (error) throw error;
    } catch (err: any) {
      console.error("Media message insert error:", err);
      Alert.alert("Error", err.message || "Failed to send media");
    }
  };

  const handleMultimedia = useCallback(() => {
    const options = [
      {
        text: "📷 Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Camera access is needed to take photos and videos.");
            return;
          }
          
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
          });
          
          if (!result.canceled) {
            const asset = result.assets[0];
            const fileName = asset.fileName || `camera-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
            const mimeType = asset.type === "video" ? "video/mp4" : "image/jpeg";
            
            try {
              const url = await uploadFileToSupabase(asset.uri, fileName, mimeType);
              await insertMediaMessage(
                url,
                mimeType.includes("video") ? "video" : "image",
                fileName
              );
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading media");
            }
          }
        },
      },
      {
        text: "🖼️ Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Gallery access is needed to select photos and videos.");
            return;
          }
          
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
          });
          
          if (!result.canceled) {
            const asset = result.assets[0];
            const fileName = asset.fileName || `gallery-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
            const mimeType = asset.type === "video" ? "video/mp4" : "image/jpeg";
            
            try {
              const url = await uploadFileToSupabase(asset.uri, fileName, mimeType);
              await insertMediaMessage(
                url,
                mimeType.includes("video") ? "video" : "image",
                fileName
              );
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading media");
            }
          }
        },
      },
      {
        text: "📄 Document",
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
          });
          
          if (!result.canceled) {
            const file = result.assets[0];
            try {
              const url = await uploadFileToSupabase(
                file.uri,
                file.name,
                file.mimeType || "application/octet-stream"
              );
              await insertMediaMessage(url, "document", file.name);
            } catch (err: any) {
              Alert.alert("Upload Failed", err.message || "Error uploading document");
            }
          }
        },
      },
      { text: "❌ Cancel", style: "cancel" as const },
    ];

    Alert.alert("📎 Attach Media", "Choose an option:", options);
  }, [senderPhone, receiverPhone, privacyMode]);

  return {
    uploadingMedia,
    handleMultimedia,
    uploadFileToSupabase,
    insertMediaMessage,
  };
};
