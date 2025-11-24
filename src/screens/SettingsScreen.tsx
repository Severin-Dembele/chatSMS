import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import StorageService from '../storage/StorageService';
import { ConnectionType } from '../types';

interface SettingsScreenProps {
  route: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ route }) => {
  const communicationService = route.params?.communicationService;
  const deviceInfo = route.params?.deviceInfo;
  
  const [connectionType, setConnectionType] = useState<ConnectionType>('wifi');
  const [wifiEnabled, setWifiEnabled] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  useEffect(() => {
    if (communicationService) {
      const activeType = communicationService.getActiveConnectionType();
      setConnectionType(activeType);
    }
  }, [communicationService]);

  const handleConnectionTypeChange = (type: ConnectionType) => {
    if (communicationService) {
      communicationService.setActiveConnectionType(type);
      setConnectionType(type);
      Alert.alert(
        'Succès',
        `Mode de connexion changé vers ${type === 'wifi' ? 'WiFi' : 'Bluetooth'}`
      );
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              Alert.alert('Succès', 'Toutes les données ont été supprimées');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer les données');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations de l'appareil</Text>
        {deviceInfo && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom:</Text>
              <Text style={styles.infoValue}>{deviceInfo.deviceName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {deviceInfo.deviceId}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mode de connexion</Text>
        <TouchableOpacity
          style={[
            styles.optionButton,
            connectionType === 'wifi' && styles.optionButtonActive,
          ]}
          onPress={() => handleConnectionTypeChange('wifi')}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionIcon}>📶</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>WiFi (Réseau local)</Text>
              <Text style={styles.optionDescription}>
                Communication via réseau WiFi local
              </Text>
            </View>
          </View>
          {connectionType === 'wifi' && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            connectionType === 'bluetooth' && styles.optionButtonActive,
          ]}
          onPress={() => handleConnectionTypeChange('bluetooth')}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionIcon}>🔵</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Bluetooth</Text>
              <Text style={styles.optionDescription}>
                Communication via Bluetooth
              </Text>
            </View>
          </View>
          {connectionType === 'bluetooth' && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Données</Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleClearAllData}
        >
          <Text style={styles.dangerButtonText}>Supprimer toutes les données</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version:</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <Text style={styles.aboutText}>
          Application de chat SMS locale fonctionnant via WiFi ou Bluetooth.
          Aucune donnée n'est envoyée sur Internet.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#8e8e93',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#8e8e93',
  },
  checkmark: {
    fontSize: 24,
    color: '#007AFF',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 20,
    marginTop: 12,
  },
});
