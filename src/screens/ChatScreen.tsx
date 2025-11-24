import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import 'react-native-get-random-values';

import { v4 as uuidv4 } from 'uuid';
import { MessageBubble } from '../components/MessageBubble';
import StorageService from '../storage/StorageService';
import { Contact, Message, ChatMessage } from '../types';

interface ChatScreenProps {
  navigation: any;
  route: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const contact: Contact = route.params?.contact;
  const communicationService = route.params?.communicationService;
  const deviceInfo = route.params?.deviceInfo;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!contact) return;
    
    try {
      const loadedMessages = await StorageService.getMessagesByContact(contact.id);
      setMessages(loadedMessages);
      
      // Marquer la conversation comme lue
      await StorageService.markConversationAsRead(contact.id);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  }, [contact]);

  useEffect(() => {
    if (contact) {
      navigation.setOptions({ title: contact.name });
      loadMessages();
    }
  }, [contact, navigation, loadMessages]);

  useEffect(() => {
    // Faire défiler vers le bas quand de nouveaux messages arrivent
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !contact || !communicationService || !deviceInfo) {
      return;
    }

    const messageId = uuidv4();
    const timestamp = Date.now();

    // Créer le message local
    const localMessage: Message = {
      id: messageId,
      contactId: contact.id,
      text: inputText.trim(),
      timestamp,
      isSent: true,
      isDelivered: false,
      isRead: false,
    };

    try {
      // Sauvegarder le message localement
      await StorageService.addMessage(localMessage);
      
      // Recharger les messages
      await loadMessages();
      
      // Créer le message réseau
      const chatMessage: ChatMessage = {
        type: 'message',
        senderId: deviceInfo.deviceId,
        senderName: deviceInfo.deviceName,
        messageId,
        text: inputText.trim(),
        timestamp,
      };

      // Envoyer le message via le service de communication
      const sent = await communicationService.sendMessage(chatMessage, contact.deviceId);

      if (sent) {
        // Marquer comme livré
        await StorageService.updateMessage(messageId, { isDelivered: true });
        await loadMessages();
      }

      // Réinitialiser l'input
      setInputText('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Aucun message</Text>
      <Text style={styles.emptySubtext}>Envoyez votre premier message</Text>
    </View>
  );

  if (!contact) {
    return (
      <View style={styles.container}>
        <Text>Contact non trouvé</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          placeholderTextColor="#8e8e93"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesList: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8e8e93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8e8e93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
