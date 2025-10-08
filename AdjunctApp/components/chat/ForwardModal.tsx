import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';

interface Contact {
  phone: string;
  name: string;
}

interface ForwardModalProps {
  visible: boolean;
  contacts: Contact[];
  contactSearch: string;
  onContactSearchChange: (text: string) => void;
  onClearSearch: () => void;
  onForwardToContact: (phone: string) => void;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  visible,
  contacts,
  contactSearch,
  onContactSearchChange,
  onClearSearch,
  onForwardToContact,
  onClose,
}) => {
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.phone.includes(contactSearch)
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.forwardModalContent}>
          <View style={styles.forwardHeader}>
            <Text style={styles.forwardTitle}>Forward to</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.forwardClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={contactSearch}
              onChangeText={onContactSearchChange}
              autoCapitalize="none"
            />
            {contactSearch.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearch}
                onPress={onClearSearch}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.phone}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => onForwardToContact(item.phone)}
              >
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactInitial}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.contactList}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>
                  {contactSearch ? "No contacts found" : "No contacts available"}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forwardModalContent: {
    backgroundColor: '#F5F5DC',
    width: '100%',
    marginHorizontal: 20,
    borderRadius: 0,
    maxHeight: '100%',
    elevation: 5,
  },
  forwardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C4B896',
    backgroundColor: '#dcd0a8',
  },
  forwardTitle: {
    fontSize: 18,
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  forwardClose: {
    fontSize: 20,
    color: '#666',
  },
  contactList: {
    maxHeight: 400,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9E9',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInitial: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontFamily: 'Kreon-Bold',
    color: '#000',
  },
  contactPhone: {
    fontSize: 14,
    fontFamily: 'Kreon-Regular',
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: '#C4B896',
    borderRadius: 8,
    backgroundColor: '#F5F5DC',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Kreon-Regular',
    color: '#000',
  },
  clearSearch: {
    padding: 10,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#666',
  },
  emptySearch: {
    padding: 20,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Kreon-Regular',
  },
});
