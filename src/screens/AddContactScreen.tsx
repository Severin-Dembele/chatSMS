import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import StorageService from '../storage/StorageService';
import { Contact, Device } from '../types';

interface AddContactScreenProps {
  navigation: any;
  route: any;
}

export const AddContactScreen: React.FC<AddContactScreenProps> = ({
  navigation,
  route,
}) => {
  const [name, setName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[]>([]);
  const communicationService = route.params?.communicationService;

  useEffect(() => {
    if (communicationService) {
      // Récupérer les appareils déjà découverts
      const devices = communicationService.getDiscoveredDevices();
      setDiscoveredDevices(devices);
    }
  }, [communicationService]);

  const handleScanDevices = async () => {
    if (!communicationService) {
      Alert.alert('Erreur', 'Service de communication non disponible');
      return;
    }

    setIsScanning(true);
    
    if (communicationService.getActiveConnectionType() === 'bluetooth') {
      await communicationService.startBluetoothScanning();
      
      // Arrêter le scan après 10 secondes
      setTimeout(() => {
        communicationService.stopBluetoothScanning();
        setIsScanning(false);
        const devices = communicationService.getDiscoveredDevices();
        setDiscoveredDevices(devices);
      }, 10000);
    } else {
      // Pour WiFi, les appareils sont découverts automatiquement
      setTimeout(() => {
        setIsScanning(false);
        const devices = communicationService.getDiscoveredDevices();
        setDiscoveredDevices(devices);
      }, 3000);
    }
  };

  const handleSelectDevice = (device: Device) => {
    setDeviceId(device.id);
    setName(device.name);
  };

  const handleSaveContact = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom');
      return;
    }

    if (!deviceId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer ou sélectionner un ID d\'appareil');
      return;
    }

    try {
      // Vérifier si le contact existe déjà
      const existingContact = await StorageService.getContactByDeviceId(deviceId);
      
      if (existingContact) {
        Alert.alert('Erreur', 'Un contact avec cet ID d\'appareil existe déjà');
        return;
      }

      const newContact: Contact = {
        id: uuidv4(),
        name: name.trim(),
        deviceId: deviceId.trim(),
      };

      await StorageService.addContact(newContact);
      Alert.alert('Succès', 'Contact ajouté avec succès');
      navigation.goBack();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le contact' + error?.toString()) ;
    }
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={[
        styles.deviceItem,
        deviceId === item.id && styles.selectedDevice,
      ]}
      onPress={() => handleSelectDevice(item)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceId}>ID: {item.id.substring(0, 20)}...</Text>
        <Text style={styles.deviceType}>
          {item.type === 'wifi' ? '📶 WiFi' : '🔵 Bluetooth'}
        </Text>
      </View>
      {deviceId === item.id && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Nom du contact</Text>
        <TextInput
          style={styles.input}
          placeholder="Entrez le nom"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#8e8e93"
        />

        <Text style={styles.label}>ID de l'appareil</Text>
        <TextInput
          style={styles.input}
          placeholder="Entrez l'ID ou scannez"
          value={deviceId}
          onChangeText={setDeviceId}
          placeholderTextColor="#8e8e93"
        />

        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanDevices}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.scanButtonText}>Rechercher des appareils</Text>
          )}
        </TouchableOpacity>

        {discoveredDevices.length > 0 && (
          <View style={styles.devicesContainer}>
            <Text style={styles.devicesTitle}>Appareils découverts:</Text>
            <FlatList
              data={discoveredDevices}
              renderItem={renderDevice}
              keyExtractor={item => item.id}
              style={styles.devicesList}
            />
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveContact}>
          <Text style={styles.saveButtonText}>Enregistrer le contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scanButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesContainer: {
    marginTop: 24,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  devicesList: {
    maxHeight: 200,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDevice: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 12,
    color: '#8e8e93',
  },
  checkmark: {
    fontSize: 24,
    color: '#007AFF',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
