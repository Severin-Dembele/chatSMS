import { BleManager, Device as BleDevice, Characteristic } from 'react-native-ble-plx';
import { ChatMessage, Device } from '../types';
import { Buffer } from 'buffer';

const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

export class BluetoothService {
  private bleManager: BleManager;
  private deviceId: string;
  private deviceName: string;
  private connectedDevices: Map<string, BleDevice> = new Map();
  private onMessageReceived?: (message: ChatMessage) => void;
  private onDeviceDiscovered?: (device: Device) => void;
  private isScanning: boolean = false;

  constructor(deviceId: string, deviceName: string) {
    this.bleManager = new BleManager();
    this.deviceId = deviceId;
    this.deviceName = deviceName;
  }

  async initialize(
    onMessageReceived: (message: ChatMessage) => void,
    onDeviceDiscovered: (device: Device) => void
  ): Promise<boolean> {
    try {
      this.onMessageReceived = onMessageReceived;
      this.onDeviceDiscovered = onDeviceDiscovered;

      // Vérifier l'état du Bluetooth
      const state = await this.bleManager.state();
      
      if (state !== 'PoweredOn') {
        console.log('Bluetooth non activé');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du Bluetooth:', error);
      return false;
    }
  }

  async startScanning(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      
      this.bleManager.startDeviceScan(
        [SERVICE_UUID],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Erreur lors du scan Bluetooth:', error);
            return;
          }

          if (device && device.name) {
            const discoveredDevice: Device = {
              id: device.id,
              name: device.name,
              type: 'bluetooth',
            };

            this.onDeviceDiscovered?.(discoveredDevice);
          }
        }
      );

      // Arrêter le scan après 30 secondes
      setTimeout(() => {
        this.stopScanning();
      }, 30000);
    } catch (error) {
      console.error('Erreur lors du démarrage du scan:', error);
      this.isScanning = false;
    }
  }

  stopScanning(): void {
    if (this.isScanning) {
      this.bleManager.stopDeviceScan();
      this.isScanning = false;
    }
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      const device = await this.bleManager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();

      // S'abonner aux notifications
      device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Erreur lors de la réception de données:', error);
            return;
          }

          if (characteristic?.value) {
            try {
              const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf-8');
              const message: ChatMessage = JSON.parse(decodedValue);
              
              if (message.senderId !== this.deviceId) {
                this.onMessageReceived?.(message);
              }
            } catch (error) {
              console.error('Erreur lors du décodage du message:', error);
            }
          }
        }
      );

      this.connectedDevices.set(deviceId, device);
      return true;
    } catch (error) {
      console.error('Erreur lors de la connexion au périphérique:', error);
      return false;
    }
  }

  async disconnectFromDevice(deviceId: string): Promise<void> {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (device) {
        await device.cancelConnection();
        this.connectedDevices.delete(deviceId);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }

  async sendMessage(message: ChatMessage, targetDeviceId?: string): Promise<boolean> {
    try {
      const messageStr = JSON.stringify(message);
      const encodedMessage = Buffer.from(messageStr).toString('base64');

      if (targetDeviceId) {
        // Envoi à un périphérique spécifique
        const device = this.connectedDevices.get(targetDeviceId);
        if (device) {
          await device.writeCharacteristicWithResponseForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            encodedMessage
          );
          return true;
        }
        return false;
      } else {
        // Envoi à tous les périphériques connectés
        const promises = Array.from(this.connectedDevices.values()).map(device =>
          device.writeCharacteristicWithResponseForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            encodedMessage
          )
        );
        
        await Promise.all(promises);
        return true;
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message Bluetooth:', error);
      return false;
    }
  }

  getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  cleanup(): void {
    this.stopScanning();
    
    // Déconnecter tous les périphériques
    this.connectedDevices.forEach(async (device) => {
      try {
        await device.cancelConnection();
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    });
    
    this.connectedDevices.clear();
  }
}
