const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: "#E9E9E9" },
  container: { flex: 1, backgroundColor: "#dcd0a8" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 14, fontFamily: "Kreon-Regular", color: "#000" },
  username: { fontSize: 28, fontFamily: "Kreon-Bold", color: "#000" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  searchButton: {
    marginRight: 16,
    padding: 4,
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5D4FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  statusTouchable: {
    padding: 4,
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#FF9500",
  },
  semiactiveDot: {
    backgroundColor: "#34C759",
  },
  offlineDot: {
    backgroundColor: "#C4C4C4",
  },
  
  // SELECTION MODE STYLES
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  exitText: {
    fontSize: 14,
    marginLeft: 4,
    color: "#000",
    fontFamily: "Kreon-Regular",
  },
  selectionCount: {
    fontSize: 18,
    fontFamily: "Kreon-Bold",
    color: "#000",
  },
  lockButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  lockButtonDisabled: {
    backgroundColor: "#C4C4C4",
  },
  lockButtonText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 4,
    fontFamily: "Kreon-Bold",
  },
  unlockButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  unlockButtonDisabled: {
    backgroundColor: "#C4C4C4",
  },
  unlockButtonText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 4,
    fontFamily: "Kreon-Bold",
  },
  
  // SECRET ACCESS BUTTON
  secretAccessButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE4D6",
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FF6B35",
  },
  secretAccessText: {
    fontSize: 16,
    fontFamily: "Kreon-Bold",
    color: "#FF6B35",
    marginHorizontal: 8,
  },
  
  chatsSection: {
    flex: 1,
    backgroundColor: "#E9E9E9",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  
  // SECTION HEADERS
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
    backgroundColor: "#E9E9E9",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Kreon-Bold",
    color: "#333",
    marginRight: 8,
  },
  secretBadge: {
    backgroundColor: "#FFE4D6",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#FF6B35",
  },
  
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  selectedChatItem: {
    backgroundColor: "#E3F2FD",
  },
  lockedChatItem: {
    backgroundColor: "#FFF5F5",
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
    paddingLeft: 12,
  },
  
  // LOCK ICON
  lockIcon: {
    marginRight: 8,
    backgroundColor: "#FFE4D6",
    borderRadius: 12,
    padding: 4,
  },
  
  // SELECTION CIRCLE
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectionFill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#007AFF",
  },
  
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center",
  },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontFamily: "Kreon-Bold" },
  chatMessage: { fontSize: 14, color: "#555", fontFamily: "Kreon-Regular" },
  chatTime: { fontSize: 12, color: "#999", fontFamily: "Kreon-Regular" },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  plusButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  unreadBadge: {
    backgroundColor: "#34C759",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    minWidth: 20,
    alignItems: "center",
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Kreon-Bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: "Kreon-Regular",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Kreon-Regular",
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    marginLeft: 8,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "Kreon-Bold",
  },
  
  // FORGOT PASSWORD STYLES
  forgotPasswordButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#FF6B35",
    fontFamily: "Kreon-Regular",
    textDecorationLine: "underline",
  },
  securityQuestionText: {
    fontSize: 16,
    fontFamily: "Kreon-Regular",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
});import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  Animated,
  BackHandler,
  SectionList,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";
import * as Contacts from "expo-contacts";
import LinearGradient from "react-native-linear-gradient";
import * as SecureStore from "expo-secure-store";

interface Conversation {
  id: string | number;
  phoneNumber: string;
  name: string;
  profileImage: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  status?: "active" | "semiactive" | "offline";
}

interface SupabaseMessage {
  id: string | number;
  sender_phone: string;
  receiver_phone: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface UserMode {
  phone_number: string;
  mode: "active" | "semiactive" | "offline";
}

interface ChatSection {
  title: string;
  data: Conversation[];
}

export default function ChatsScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userName, setUserName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactsMap, setContactsMap] = useState<Record<string, string>>({});
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const statusSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<"active" | "semiactive" | "offline">("offline");
  const [lockedChats, setLockedChats] = useState<string[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // UNLOCK SELECTION MODE STATE
  const [unlockSelectionMode, setUnlockSelectionMode] = useState(false);
  const [selectedUnlockChats, setSelectedUnlockChats] = useState<string[]>([]);
  
  // LOCK SELECTION MODE STATE
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  
  // FORGOT PASSWORD STATE
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSettingSecurityQuestion, setIsSettingSecurityQuestion] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'question' | 'reset'>('question');
  
  // Show locked chats in separate section
  const [showLockedSection, setShowLockedSection] = useState(false);
  
  // Swipe gesture for unlock
  const translateY = useRef(new Animated.Value(0)).current;
  
  const normalizePhone = (phone?: string) => phone?.replace(/\D/g, "") || "";

  // Get phone number from AsyncStorage
  const getPhoneFromStorage = async () => {
    try {
      const storedPhone = await AsyncStorage.getItem('senderPhone');
      return storedPhone ? normalizePhone(storedPhone) : null;
    } catch (error) {
      console.error('Error getting phone from AsyncStorage:', error);
      return null;
    }
  };

  const loadContacts = async () => {
    if (contactsLoaded) return contactsMap;
    
    try {
      const storedContacts = await AsyncStorage.getItem('contactsMap');
      if (storedContacts) {
        const parsedContacts = JSON.parse(storedContacts);
        setContactsMap(parsedContacts);
        setContactsLoaded(true);
        return parsedContacts;
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setContactsLoaded(true);
        return {};
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      const phoneMap: Record<string, string> = {};
      data.forEach((contact) => {
        contact.phoneNumbers?.forEach((num) => {
          const clean = normalizePhone(num.number);
          if (clean) phoneMap[clean] = contact.name || "";
        });
      });

      await AsyncStorage.setItem('contactsMap', JSON.stringify(phoneMap));
      setContactsMap(phoneMap);
      setContactsLoaded(true);
      return phoneMap;
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContactsLoaded(true);
      return {};
    }
  };
  
  const getUserProfile = async (senderPhone: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("phone_number", senderPhone)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
      } else if (data) {
        setUserName(data.name);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const initializeUserStatus = async (phone: string) => {
    try {
      const { data: existingRecord } = await supabase
        .from("usersmodes")
        .select("phone")
        .eq("phone", phone)
        .single();

      if (!existingRecord) {
        const { error } = await supabase
          .from("usersmodes")
          .insert({ phone: phone, mode: "offline" });

        if (error) {
          console.error("Error creating initial user status record:", error.message);
        } else {
          console.log(`Created initial status record for ${phone} with default mode: offline`);
          setUserStatus("offline");
        }
      } else {
        await fetchUserStatus(phone);
      }
    } catch (error) {
      console.error("Error in initializeUserStatus:", error);
      setUserStatus("offline");
    }
  };

  const fetchUserStatus = async (phone: string) => {
    try {
      const { data, error } = await supabase
        .from("usersmodes")
        .select("mode")
        .eq("phone", phone)
        .single();

      if (error) {
        console.error("Error fetching user status:", error.message);
        setUserStatus("offline");
      } else {
        const userData = data as UserMode;
        const mode = userData?.mode || "offline";
        setUserStatus(mode);
      }
    } catch (error) {
      console.error("Error in fetchUserStatus:", error);
      setUserStatus("offline");
    }
  };

  const fetchLockedChats = async (phone: string) => {
    const locked = await getLockedChats(phone);
    setLockedChats(locked);
  };

  const subscribeToStatusChanges = (phone: string) => {
    if (statusSubscriptionRef.current) {
      supabase.removeChannel(statusSubscriptionRef.current);
    }

    const channel = supabase.channel("usersmodes-realtime");

    channel.on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "usersmodes",
        filter: `phone_number=eq.${phone}`
      },
      (payload) => {
        if (payload.new && (payload.new as UserMode).mode) {
          setUserStatus((payload.new as UserMode).mode);
        }
      }
    );

    channel.subscribe();
    statusSubscriptionRef.current = channel;
  };

  const fetchUserAndContacts = useCallback(async () => {
    if (isInitialized) return;
    
    const contacts = await loadContacts();
  
    const storedPhone = await getPhoneFromStorage();
    
    if (storedPhone) {
      setPhoneNumber(storedPhone);
      await initializeUserStatus(storedPhone);
      subscribeToStatusChanges(storedPhone);
      await fetchConversations(storedPhone);
      subscribeToMessages(storedPhone);
      await fetchLockedChats(storedPhone);
      setIsInitialized(true);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("name, phone_number")
        .eq("user_id", user.id)
        .single();

      const phone = normalizePhone(data?.phone_number);
      setUserName(data?.name || "User");
      
      if (phone) {
        setPhoneNumber(phone);
        await AsyncStorage.setItem('senderPhone', phone);
        await initializeUserStatus(phone);
        subscribeToStatusChanges(phone);
        await fetchConversations(phone);
        subscribeToMessages(phone);
        await fetchLockedChats(phone);
        setIsInitialized(true);
      }
    }
  }, [isInitialized]);

  // UNLOCK SELECTION FUNCTIONS
  const toggleUnlockSelectionMode = () => {
    setUnlockSelectionMode(!unlockSelectionMode);
    setSelectedUnlockChats([]);
    setShowLockedSection(true);
  };

  const exitUnlockSelectionMode = () => {
    setUnlockSelectionMode(false);
    setSelectedUnlockChats([]);
    setShowLockedSection(false);
  };

  const toggleUnlockChatSelection = (phoneNumber: string) => {
    const normalizedPhone = normalizePhone(phoneNumber);
    setSelectedUnlockChats(prev => 
      prev.includes(normalizedPhone) 
        ? prev.filter(p => p !== normalizedPhone)
        : [...prev, normalizedPhone]
    );
  };

  const handleUnlockSelectedChats = async () => {
    if (selectedUnlockChats.length === 0) {
      Alert.alert("No Selection", "Please select chats to unlock");
      return;
    }

    try {
      for (const chatPhone of selectedUnlockChats) {
        await unlockChat(phoneNumber, chatPhone);
      }
      
      setLockedChats(prev => prev.filter(phone => !selectedUnlockChats.includes(phone)));
      setSelectedUnlockChats([]);
      setUnlockSelectionMode(false);
      setShowLockedSection(false);
      
      Alert.alert("Chats Unlocked", `${selectedUnlockChats.length} chat(s) have been unlocked`);
    } catch (error) {
      console.error("Error unlocking chats:", error);
      Alert.alert("Error", "Failed to unlock chats");
    }
  };

  const fetchConversations = async (currentUserPhone: string) => {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_phone.eq.${currentUserPhone},receiver_phone.eq.${currentUserPhone}`)
      .order("created_at", { ascending: false });

    const latestMap = new Map<string, SupabaseMessage>();
    const unreadMap: Record<string, number> = {};

    messages?.forEach((msg) => {
      const partner =
        msg.sender_phone === currentUserPhone ? msg.receiver_phone : msg.sender_phone;
      const clean = normalizePhone(partner);

      if (!latestMap.has(clean)) latestMap.set(clean, msg);

      if (msg.receiver_phone === currentUserPhone && !msg.is_read) {
        unreadMap[clean] = (unreadMap[clean] || 0) + 1;
      }
    });

    const partnerPhones = Array.from(latestMap.keys());
    const { data: partners } = await supabase
      .from("profiles")
      .select("phone_number, profile_picture")
      .in("phone_number", partnerPhones);

    const result: Conversation[] = partnerPhones.map((phone) => {
      const msg = latestMap.get(phone)!;
      const partner = partners?.find(
        (p) => normalizePhone(p.phone_number) === phone
      );

      const randomStatus = ["active", "semiactive", "offline"][
        Math.floor(Math.random() * 3)
      ] as "active" | "semiactive" | "offline";

      return {
        id: msg.id,
        phoneNumber: phone,
        name: contactsMap[phone] || phone,
        profileImage: partner?.profile_picture || "",
        lastMessage: msg.message,
        time: new Date(msg.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        unreadCount: unreadMap[phone] || 0,
        status: randomStatus,
      };
    });

    setConversations(result);
  };

  // LOCK/UNLOCK FUNCTIONS
  const LOCK_KEY = "chatlock_password";
  const SECURITY_QUESTION_KEY = "security_question";
  const SECURITY_ANSWER_KEY = "security_answer";
  
  const saveLockPassword = async (phoneNumber: string, password: string) => {
    await SecureStore.setItemAsync(LOCK_KEY, password);
    
    const { error } = await supabase
      .from("profiles")
      .update({ lock_password: password })
      .eq("phone_number", phoneNumber);

    if (error) {
      console.error("Failed to save lock password to Supabase:", error.message);
    }
  };

  const saveSecurityQuestion = async (phoneNumber: string, question: string, answer: string) => {
    await SecureStore.setItemAsync(SECURITY_QUESTION_KEY, question);
    await SecureStore.setItemAsync(SECURITY_ANSWER_KEY, answer);
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        security_question: question,
        security_answer: answer 
      })
      .eq("phone_number", phoneNumber);

    if (error) {
      console.error("Failed to save security question to Supabase:", error.message);
    }
  };

  const getSecurityQuestion = async (phoneNumber: string) => {
    const localQuestion = await SecureStore.getItemAsync(SECURITY_QUESTION_KEY);
    if (localQuestion) return localQuestion;

    const { data, error } = await supabase
      .from("profiles")
      .select("security_question")
      .eq("phone_number", phoneNumber)
      .single();

    if (error) {
      console.error("Error fetching security question:", error.message);
      return null;
    }

    return data?.security_question || null;
  };

  const verifySecurityAnswer = async (phoneNumber: string, inputAnswer: string) => {
    const localAnswer = await SecureStore.getItemAsync(SECURITY_ANSWER_KEY);
    if (localAnswer) {
      return localAnswer.toLowerCase() === inputAnswer.toLowerCase();
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("security_answer")
      .eq("phone_number", phoneNumber)
      .single();

    if (error) {
      console.error("Error fetching security answer:", error.message);
      return false;
    }

    return data?.security_answer?.toLowerCase() === inputAnswer.toLowerCase();
  };
  
  const getLocalLockPassword = async () => {
    return await SecureStore.getItemAsync(LOCK_KEY);
  };

  const getLockedChats = async (userPhone: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from("chatlock")
      .select("chat_phone")
      .eq("user_phone", userPhone);

    if (error) {
      console.error("Failed to fetch locked chats:", error.message);
      return [];
    }

    return data.map((row) => row.chat_phone);
  };

  const getSupabaseLockPassword = async (phoneNumber: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("lock_password")
      .eq("phone_number", phoneNumber)
      .single();

    if (error) {
      console.error("Error fetching lock password from Supabase:", error.message);
      return null;
    }

    return data?.lock_password || null;
  };

  const lockChat = async (userPhone: string, chatPhone: string) => {
    const { error } = await supabase
      .from("chatlock")
      .upsert([{ user_phone: userPhone, chat_phone: chatPhone }]);

    if (error) {
      console.error("Failed to lock chat:", error.message);
      return false;
    }

    return true;
  };

  const unlockChat = async (userPhone: string, chatPhone: string) => {
    const { error } = await supabase
      .from("chatlock")
      .delete()
      .eq("user_phone", userPhone)
      .eq("chat_phone", chatPhone);

    if (error) {
      console.error("Failed to unlock chat:", error.message);
      return false;
    }

    return true;
  };

  // SELECTION MODE FUNCTIONS
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedChats([]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedChats([]);
  };

  const toggleChatSelection = (phoneNumber: string) => {
    const normalizedPhone = normalizePhone(phoneNumber);
    setSelectedChats(prev => 
      prev.includes(normalizedPhone) 
        ? prev.filter(p => p !== normalizedPhone)
        : [...prev, normalizedPhone]
    );
  };

  const checkPasswordExists = async () => {
    const localPassword = await getLocalLockPassword();
    const supabasePassword = await getSupabaseLockPassword(phoneNumber);
    return localPassword || supabasePassword;
  };

  const handleLockSelectedChats = async () => {
    if (selectedChats.length === 0) {
      Alert.alert("No Selection", "Please select chats to lock");
      return;
    }

    const passwordExists = await checkPasswordExists();
    
    if (!passwordExists) {
      setIsSettingPassword(true);
      setIsSettingSecurityQuestion(true);
      setShowPasswordModal(true);
    } else {
      setIsSettingPassword(false);
      setIsSettingSecurityQuestion(false);
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async () => {
    if (isSettingPassword) {
      if (passwordInput.length < 4) {
        Alert.alert("Password Too Short", "Password must be at least 4 characters");
        return;
      }
      
      if (passwordInput !== confirmPasswordInput) {
        Alert.alert("Password Mismatch", "Passwords don't match");
        return;
      }

      if (isSettingSecurityQuestion) {
        if (!securityQuestion || !securityAnswer) {
          Alert.alert("Incomplete", "Please provide both security question and answer");
          return;
        }
        await saveSecurityQuestion(phoneNumber, securityQuestion, securityAnswer);
      }

      await saveLockPassword(phoneNumber, passwordInput);
      await lockSelectedChats();
    } else {
      const storedPassword = await getLocalLockPassword() || await getSupabaseLockPassword(phoneNumber);
      
      if (passwordInput === storedPassword) {
        await lockSelectedChats();
      } else {
        Alert.alert("Wrong Password", "Please enter the correct password");
        return;
      }
    }

    setShowPasswordModal(false);
    setPasswordInput("");
    setConfirmPasswordInput("");
    setSecurityQuestion("");
    setSecurityAnswer("");
  };

  const lockSelectedChats = async () => {
    try {
      for (const chatPhone of selectedChats) {
        await lockChat(phoneNumber, chatPhone);
      }
      
      setLockedChats(prev => [...prev, ...selectedChats]);
      setSelectedChats([]);
      setSelectionMode(false);
      
      Alert.alert("Chats Locked", `${selectedChats.length} chat(s) have been locked`);
    } catch (error) {
      console.error("Error locking chats:", error);
      Alert.alert("Error", "Failed to lock chats");
    }
  };

  // ACCESS LOCKED CHATS
  const handleAccessLockedChats = () => {
    setShowLockedSection(true);
  };

  const handleUnlockRequest = async () => {
    const passwordExists = await checkPasswordExists();
    
    if (!passwordExists) {
      Alert.alert("No Password Set", "You haven't set a lock password yet");
      return;
    }
    
    setShowUnlockModal(true);
  };

  const handleUnlockVerification = async () => {
    const storedPassword = await getLocalLockPassword() || await getSupabaseLockPassword(phoneNumber);
    
    if (unlockPasswordInput === storedPassword) {
      setIsUnlocked(true);
      setShowUnlockModal(false);
      setUnlockPasswordInput("");
      setShowLockedSection(true);
      
      setTimeout(() => {
        setIsUnlocked(false);
        setShowLockedSection(false);
      }, 30000);
      
      Alert.alert("Unlocked", "Locked chats are now visible for 30 seconds");
    } else {
      Alert.alert("Wrong Password", "Please enter the correct password");
    }
  };

  // FORGOT PASSWORD FUNCTIONS
  const handleForgotPassword = async () => {
    const question = await getSecurityQuestion(phoneNumber);
    if (!question) {
      Alert.alert("No Security Question", "You haven't set up a security question for password recovery");
      return;
    }
    
    setSecurityQuestion(question);
    setForgotPasswordStep('question');
    setShowForgotPasswordModal(true);
    setShowUnlockModal(false);
  };

  const handleSecurityAnswerSubmit = async () => {
    const isCorrect = await verifySecurityAnswer(phoneNumber, securityAnswer);
    if (isCorrect) {
      setForgotPasswordStep('reset');
    } else {
      Alert.alert("Wrong Answer", "Security answer is incorrect");
    }
  };

  const handlePasswordReset = async () => {
    if (newPassword.length < 4) {
      Alert.alert("Password Too Short", "Password must be at least 4 characters");
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Password Mismatch", "Passwords don't match");
      return;
    }

    await saveLockPassword(phoneNumber, newPassword);
    
    setShowForgotPasswordModal(false);
    setSecurityAnswer("");
    setNewPassword("");
    setConfirmNewPassword("");
    
    Alert.alert("Password Reset", "Your password has been reset successfully");
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) {
      if (event.nativeEvent.translationY > 50) {
        handleUnlockRequest();
      }
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const markMessagesAsRead = async (partnerPhone: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        normalizePhone(c.phoneNumber) === normalizePhone(partnerPhone)
          ? { ...c, unreadCount: 0 }
          : c
      )
    );

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_phone", partnerPhone)
      .eq("receiver_phone", phoneNumber)
      .eq("is_read", false);
  };

  const subscribeToMessages = (currentUserPhone: string) => {
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);

    const channel = supabase.channel("messages-realtime");

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const newMsg = payload.new as SupabaseMessage;
        if (
          newMsg.sender_phone !== currentUserPhone &&
          newMsg.receiver_phone !== currentUserPhone
        )
          return;

        const partner =
          newMsg.sender_phone === currentUserPhone
            ? newMsg.receiver_phone
            : newMsg.sender_phone;
        const clean = normalizePhone(partner);

        const existing = conversations.find(
          (c) => normalizePhone(c.phoneNumber) === clean
        );

        let profileImage = existing?.profileImage || "";
        if (!existing) {
          const { data: partnerData } = await supabase
            .from("profiles")
            .select("profile_picture")
            .eq("phone_number", partner)
            .single();
          profileImage = partnerData?.profile_picture || "";
        }

        const unreadCount =
          newMsg.receiver_phone === currentUserPhone && !newMsg.is_read
            ? (existing?.unreadCount || 0) + 1
            : existing?.unreadCount || 0;

        const updatedConv: Conversation = {
          id: newMsg.id,
          phoneNumber: partner,
          name: contactsMap[clean] || partner,
          profileImage,
          lastMessage: newMsg.message,
          time: new Date(newMsg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unreadCount,
          status: existing?.status || "offline",
        };

        setConversations((prev) => [
          updatedConv,
          ...prev.filter((c) => normalizePhone(c.phoneNumber) !== clean),
        ]);
      }
    );

    channel.subscribe();
    subscriptionRef.current = channel;
  };

  useFocusEffect(
    useCallback(() => {
      if (phoneNumber && contactsLoaded && isInitialized) {
        fetchConversations(phoneNumber);
      }
    }, [phoneNumber, contactsLoaded, isInitialized])
  );

  useEffect(() => {
    if (phoneNumber) {
      getUserProfile(phoneNumber);
    }
  }, [phoneNumber]);

  useEffect(() => {
    fetchUserAndContacts();
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (statusSubscriptionRef.current) supabase.removeChannel(statusSubscriptionRef.current);
      backHandler.remove();
    };
  }, [fetchUserAndContacts, selectionMode]);

  const getNextStatus = (currentStatus: "active" | "semiactive" | "offline") => {
    switch (currentStatus) {
      case "active": return "semiactive";
      case "semiactive": return "offline";
      case "offline": return "active";
      default: return "active";
    }
  };

  const toggleUserStatus = async () => {
    if (!phoneNumber) {
      console.log("No phone number available");
      return;
    }

    const newStatus = getNextStatus(userStatus);
    setUserStatus(newStatus);

    try {
      const { error } = await supabase
        .from("usersmodes")
        .update({ mode: newStatus })
        .eq("phone", phoneNumber);

      if (error) {
        console.error("Failed to update status:", error.message);
        setUserStatus(userStatus);
      } else {
        console.log(`Status updated to: ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setUserStatus(userStatus);
    }
  };

  const getStatusDotStyle = (status: "active" | "semiactive" | "offline") => {
    switch (status) {
      case "active": return styles.activeDot;
      case "semiactive": return styles.semiactiveDot;
      case "offline": return styles.offlineDot;
      default: return styles.offlineDot;
    }
  };

  const handleOpenChat = (phone: string) => {
    if (selectionMode) {
      toggleChatSelection(phone);
      return;
    }
    
    if (unlockSelectionMode) {
      toggleUnlockChatSelection(phone);
      return;
    }
    
    markMessagesAsRead(phone);
    router.push(`/chats/${phone}`);
  };

  const handleBackPress = () => {
    if (selectionMode) {
      exitSelectionMode();
      return true;
    }
    if (unlockSelectionMode) {
      exitUnlockSelectionMode();
      return true;
    }}}