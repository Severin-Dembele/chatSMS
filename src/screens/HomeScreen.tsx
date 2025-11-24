import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { ConversationItem } from '../components/ConversationItem';
import StorageService from '../storage/StorageService';
import { Contact, Conversation } from '../types';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [loadedConversations, loadedContacts] = await Promise.all([
        StorageService.getConversations(),
        StorageService.getContacts(),
      ]);

      // Trier les conversations par date du dernier message
      const sortedConversations = loadedConversations.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0;
        const timeB = b.lastMessage?.timestamp || 0;
        return timeB - timeA;
      });

      setConversations(sortedConversations);
      setContacts(loadedContacts);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Recharger les données quand l'écran est focus
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleConversationPress = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      navigation.navigate('Chat', { contact });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const contact = contacts.find(c => c.id === item.contactId);
    if (!contact) return null;

    return (
      <ConversationItem
        contact={contact}
        conversation={item}
        onPress={() => handleConversationPress(item.contactId)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Aucune conversation</Text>
      <Text style={styles.emptyText}>
        Ajoutez un contact pour commencer à discuter
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Contacts')}
      >
        <Text style={styles.emptyButtonText}>Voir les contacts</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.contactId}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
