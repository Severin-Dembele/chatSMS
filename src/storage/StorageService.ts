import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact, Message, Conversation } from '../types';

const CONTACTS_KEY = '@chat_sms_contacts';
const MESSAGES_KEY = '@chat_sms_messages';
const CONVERSATIONS_KEY = '@chat_sms_conversations';
const DEVICE_INFO_KEY = '@chat_sms_device_info';

export class StorageService {
  // Contacts
  async saveContacts(contacts: Contact[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des contacts:', error);
      throw error;
    }
  }

  async getContacts(): Promise<Contact[]> {
    try {
      const contactsJson = await AsyncStorage.getItem(CONTACTS_KEY);
      return contactsJson ? JSON.parse(contactsJson) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des contacts:', error);
      return [];
    }
  }

  async addContact(contact: Contact): Promise<void> {
    try {
      const contacts = await this.getContacts();
      const existingIndex = contacts.findIndex(c => c.id === contact.id);
      
      if (existingIndex >= 0) {
        contacts[existingIndex] = contact;
      } else {
        contacts.push(contact);
      }
      
      await this.saveContacts(contacts);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error);
      throw error;
    }
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<void> {
    try {
      const contacts = await this.getContacts();
      const index = contacts.findIndex(c => c.id === contactId);
      
      if (index >= 0) {
        contacts[index] = { ...contacts[index], ...updates };
        await this.saveContacts(contacts);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du contact:', error);
      throw error;
    }
  }

  async deleteContact(contactId: string): Promise<void> {
    try {
      const contacts = await this.getContacts();
      const filteredContacts = contacts.filter(c => c.id !== contactId);
      await this.saveContacts(filteredContacts);
      
      // Supprimer aussi les messages associés
      await this.deleteMessagesByContact(contactId);
    } catch (error) {
      console.error('Erreur lors de la suppression du contact:', error);
      throw error;
    }
  }

  async getContactById(contactId: string): Promise<Contact | null> {
    try {
      const contacts = await this.getContacts();
      return contacts.find(c => c.id === contactId) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du contact:', error);
      return null;
    }
  }

  async getContactByDeviceId(deviceId: string): Promise<Contact | null> {
    try {
      const contacts = await this.getContacts();
      return contacts.find(c => c.deviceId === deviceId) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du contact par deviceId:', error);
      return null;
    }
  }

  // Messages
  async saveMessages(messages: Message[]): Promise<void> {
    try {
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des messages:', error);
      throw error;
    }
  }

  async getMessages(): Promise<Message[]> {
    try {
      const messagesJson = await AsyncStorage.getItem(MESSAGES_KEY);
      return messagesJson ? JSON.parse(messagesJson) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return [];
    }
  }

  async addMessage(message: Message): Promise<void> {
    try {
      const messages = await this.getMessages();
      messages.push(message);
      await this.saveMessages(messages);
      
      // Mettre à jour la conversation
      await this.updateConversation(message.contactId, message);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du message:', error);
      throw error;
    }
  }

  async getMessagesByContact(contactId: string): Promise<Message[]> {
    try {
      const messages = await this.getMessages();
      return messages
        .filter(m => m.contactId === contactId)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages par contact:', error);
      return [];
    }
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    try {
      const messages = await this.getMessages();
      const index = messages.findIndex(m => m.id === messageId);
      
      if (index >= 0) {
        messages[index] = { ...messages[index], ...updates };
        await this.saveMessages(messages);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message:', error);
      throw error;
    }
  }

  async deleteMessagesByContact(contactId: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const filteredMessages = messages.filter(m => m.contactId !== contactId);
      await this.saveMessages(filteredMessages);
    } catch (error) {
      console.error('Erreur lors de la suppression des messages:', error);
      throw error;
    }
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    try {
      const conversationsJson = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      return conversationsJson ? JSON.parse(conversationsJson) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      return [];
    }
  }

  async updateConversation(contactId: string, lastMessage: Message): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const index = conversations.findIndex(c => c.contactId === contactId);
      
      if (index >= 0) {
        conversations[index].lastMessage = lastMessage;
        if (!lastMessage.isSent && !lastMessage.isRead) {
          conversations[index].unreadCount += 1;
        }
      } else {
        conversations.push({
          contactId,
          lastMessage,
          unreadCount: !lastMessage.isSent && !lastMessage.isRead ? 1 : 0,
        });
      }
      
      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la conversation:', error);
      throw error;
    }
  }

  async markConversationAsRead(contactId: string): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const index = conversations.findIndex(c => c.contactId === contactId);
      
      if (index >= 0) {
        conversations[index].unreadCount = 0;
        await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
      }
      
      // Marquer tous les messages comme lus
      const messages = await this.getMessages();
      const updatedMessages = messages.map(m => {
        if (m.contactId === contactId && !m.isSent) {
          return { ...m, isRead: true };
        }
        return m;
      });
      await this.saveMessages(updatedMessages);
    } catch (error) {
      console.error('Erreur lors du marquage de la conversation comme lue:', error);
      throw error;
    }
  }

  // Device Info
  async saveDeviceInfo(deviceId: string, deviceName: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        DEVICE_INFO_KEY,
        JSON.stringify({ deviceId, deviceName })
      );
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des infos du périphérique:', error);
      throw error;
    }
  }

  async getDeviceInfo(): Promise<{ deviceId: string; deviceName: string } | null> {
    try {
      const deviceInfoJson = await AsyncStorage.getItem(DEVICE_INFO_KEY);
      return deviceInfoJson ? JSON.parse(deviceInfoJson) : null;
    } catch (error) {
      console.error('Erreur lors de la récupération des infos du périphérique:', error);
      return null;
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        CONTACTS_KEY,
        MESSAGES_KEY,
        CONVERSATIONS_KEY,
      ]);
    } catch (error) {
      console.error('Erreur lors de la suppression de toutes les données:', error);
      throw error;
    }
  }
}

export default new StorageService();
