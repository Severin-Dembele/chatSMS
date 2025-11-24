import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DeviceInfo from 'react-native-device-info';
import Ionicons from 'react-native-vector-icons/Ionicons';
import 'react-native-get-random-values';

import { v4 as uuidv4 } from 'uuid';

import { HomeScreen } from './src/screens/HomeScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { AddContactScreen } from './src/screens/AddContactScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

import { CommunicationService } from './src/services/CommunicationService';
import StorageService from './src/storage/StorageService';
import { ChatMessage } from './src/types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs({ communicationService, deviceInfo }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8e8e93',
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >

      <Tab.Screen
        name="Conversations"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={26} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={26} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Paramètres"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={26} color={color} />
          ),
        }}
      >
        {(props) => (
          <SettingsScreen
            {...props}
            route={{
              ...props.route,
              params: { communicationService, deviceInfo },
            }}
          />
        )}
      </Tab.Screen>

    </Tab.Navigator>
  );
}

export default function App() {
  const [communicationService, setCommunicationService] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Récupérer ou créer les informations de l'appareil
      let storedDeviceInfo = await StorageService.getDeviceInfo();

      if (!storedDeviceInfo) {
        const deviceId = uuidv4();
        const brand = DeviceInfo.getBrand();
        const model = DeviceInfo.getModel();
        const deviceName = `${brand} ${model}`;

        storedDeviceInfo = { deviceId, deviceName };
        await StorageService.saveDeviceInfo(deviceId, deviceName);
      }

      setDeviceInfo(storedDeviceInfo);

      // Initialiser le service de communication
      const commService = new CommunicationService(
        storedDeviceInfo.deviceId,
        storedDeviceInfo.deviceName
      );

      const handleMessageReceived = async (message) => {
        console.log('Message reçu:', message);

        if (message.type === 'message' && message.text && message.messageId) {
          let contact = await StorageService.getContactByDeviceId(message.senderId);

          if (!contact) {
            contact = {
              id: uuidv4(),
              name: message.senderName,
              deviceId: message.senderId,
              lastSeen: Date.now(),
            };
            await StorageService.addContact(contact);
          } else {
            await StorageService.updateContact(contact.id, { lastSeen: Date.now() });
          }

          const newMessage = {
            id: message.messageId,
            contactId: contact.id,
            text: message.text,
            timestamp: message.timestamp,
            isSent: false,
            isDelivered: true,
            isRead: false,
          };

          await StorageService.addMessage(newMessage);

          const deliveryConfirmation = {
            type: 'delivery',
            senderId: storedDeviceInfo.deviceId,
            senderName: storedDeviceInfo.deviceName,
            messageId: message.messageId,
            timestamp: Date.now(),
          };

          await commService.sendMessage(deliveryConfirmation, message.senderId);
        }

        if (message.type === 'delivery' && message.messageId) {
          await StorageService.updateMessage(message.messageId, { isDelivered: true });
        }

        if (message.type === 'read' && message.messageId) {
          await StorageService.updateMessage(message.messageId, { isRead: true });
        }
      };

      const handleDeviceDiscovered = (device) => {
        console.log('Appareil découvert:', device);
      };

      await commService.initialize(handleMessageReceived, handleDeviceDiscovered);

      setCommunicationService(commService);
      setIsInitialized(true);

    } catch (err) {
      console.error("Erreur d'initialisation :", err);
      setIsInitialized(true);
    }
  };

  if (!isInitialized) return null;

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          options={{ headerShown: false }}
        >
          {(props) => (
            <HomeTabs
              {...props}
              communicationService={communicationService}
              deviceInfo={deviceInfo}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="Chat"
          options={{
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          {(props) => (
            <ChatScreen
              {...props}
              route={{
                ...props.route,
                params: { ...props.route.params, communicationService, deviceInfo },
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="AddContact"
          options={{
            title: 'Ajouter un contact',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          {(props) => (
            <AddContactScreen
              {...props}
              route={{
                ...props.route,
                params: { ...props.route.params, communicationService },
              }}
            />
          )}
        </Stack.Screen>

      </Stack.Navigator>
    </NavigationContainer>
  );
}
