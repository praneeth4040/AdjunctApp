import React, { useEffect, useState } from 'react';
import * as Contacts from 'expo-contacts';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

type ContactItem = {
  id: string;
  name: string;
  phoneNumbers: string[];
  isUser: boolean;
};

export default function NewChat() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          const normalizedNumbers = data
            .flatMap((c) => c.phoneNumbers?.map((p) => normalizePhone(p.number)) || [])
            .filter(Boolean);

          const { data: existingUsers, error } = await supabase
            .from('profiles')
            .select('phone_number')
            .in('phone_number', normalizedNumbers);

          if (error) {
            console.error('Supabase error:', error);
            setLoading(false);
            return;
          }

          const matchedNumbers = (existingUsers || []).map((u) => u.phone_number);

          const allContacts: ContactItem[] = data.map((contact) => ({
            id: contact.id ?? '',
            name: contact.name || 'Unknown',
            phoneNumbers: (contact.phoneNumbers || []).map((p) => normalizePhone(p.number)),
            isUser: (contact.phoneNumbers || []).some((p) =>
              matchedNumbers.includes(normalizePhone(p.number))
            ),
          }));

          // Sort: users first, then non-users
          const sortedContacts = [
            ...allContacts.filter((c) => c.isUser),
            ...allContacts.filter((c) => !c.isUser),
          ];

          setContacts(sortedContacts);
        }
      }
      setLoading(false);
    })();
  }, []);

  const renderItem = ({ item, index }: { item: ContactItem; index: number }) => {
    const prevItem = contacts[index - 1];
    const showInviteHeader = index > 0 && prevItem?.isUser && !item.isUser;

    const handlePress = () => {
      if (item.isUser && item.phoneNumbers.length > 0) {
        router.push(`/chats/${item.phoneNumbers[0]}`);
      }
    };

    return (
      <>
        {showInviteHeader && (
          <View style={{ paddingVertical: 8 }}>
            <Text style={{ color: '#888', fontSize: 14 }}>Invite to Adjunct</Text>
            <View style={{ height: 1, backgroundColor: '#ddd', marginTop: 4 }} />
          </View>
        )}
        <TouchableOpacity
          onPress={handlePress}
          disabled={!item.isUser}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            opacity: item.isUser ? 1 : 0.5,
          }}
        >
          {/* Colored circle with initials */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 10,
              backgroundColor: stringToColor(item.name),
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
              {getInitials(item.name)}
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
            {item.isUser ? (
              <Text style={{ color: 'green' }}>On Adjunct</Text>
            ) : (
              <Text style={{ color: '#888' }}>Invite to Adjunct</Text>
            )}
          </View>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 8 }}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function getInitials(name: string): string {
  const names = name.trim().split(' ');
  if (names.length === 0) return '';
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
}

function stringToColor(str: string): string {
  // Generate a consistent color from a string (contact name)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}
