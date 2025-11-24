import dgram from 'react-native-udp';
import NetInfo from '@react-native-community/netinfo';
import { ChatMessage, Device } from '../types';
import { Buffer } from 'buffer';
import 'react-native-get-random-values'; // for crypto.getRandomValues
const DISCOVERY_PORT = 8888;
const MESSAGE_PORT = 8889;
const BROADCAST_INTERVAL = 5000;

export class NetworkService {
  private discoverySocket: any = null;
  private messageSocket: any = null;
  private deviceId: string;
  private deviceName: string;
  private onMessageReceived?: (message: ChatMessage) => void;
  private onDeviceDiscovered?: (device: Device) => void;
  private broadcastInterval: any = null;
  private discoveredDevices: Map<string, Device> = new Map();

  constructor(deviceId: string, deviceName: string) {
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

      // Vérification réseau sans Expo
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        console.log('Pas de connexion réseau disponible');
        return false;
      }

      // SOCKET POUR DÉCOUVERTE
      this.discoverySocket = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
      });

      this.discoverySocket.bind(DISCOVERY_PORT);

      this.discoverySocket.on('message', (msg: Buffer, rinfo: any) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'discovery' && data.deviceId !== this.deviceId) {
            const device: Device = {
              id: data.deviceId,
              name: data.deviceName,
              type: 'wifi',
              address: rinfo.address,
            };

            if (!this.discoveredDevices.has(device.id)) {
              this.discoveredDevices.set(device.id, device);
              this.onDeviceDiscovered?.(device);
            }
          }
        } catch (error) {
          console.error('Erreur parsing discovery:', error);
        }
      });

      // SOCKET POUR MESSAGES
      this.messageSocket = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
      });

      this.messageSocket.bind(MESSAGE_PORT);

      this.messageSocket.on('message', (msg: Buffer) => {
        try {
          const message: ChatMessage = JSON.parse(msg.toString());
          if (message.senderId !== this.deviceId) {
            this.onMessageReceived?.(message);
          }
        } catch (error) {
          console.error('Erreur parsing message:', error);
        }
      });

      // Lancer le broadcast
      this.startDiscoveryBroadcast();

      return true;
    } catch (err) {
      console.error("Erreur initialisation réseau:", err);
      return false;
    }
  }

  private startDiscoveryBroadcast() {
    this.broadcastInterval = setInterval(() => {
      this.broadcastDiscovery();
    }, BROADCAST_INTERVAL);

    // Broadcast immédiat
    this.broadcastDiscovery();
  }

  private broadcastDiscovery() {
    try {
      const discoveryMessage = JSON.stringify({
        type: 'discovery',
        deviceId: this.deviceId,
        deviceName: this.deviceName,
      });

      const message = Buffer.from(discoveryMessage);

      this.discoverySocket?.send(
        message,
        0,
        message.length,
        DISCOVERY_PORT,
        '255.255.255.255',
        (err: any) => {
          if (err) {
            console.error('Broadcast discovery error:', err);
          }
        }
      );
    } catch (error) {
      console.error('Erreur broadcast découverte:', error);
    }
  }

  async sendMessage(message: ChatMessage, targetDeviceId?: string): Promise<boolean> {
    try {
      const msgStr = JSON.stringify(message);
      const buffer = Buffer.from(msgStr);

      if (targetDeviceId) {
        const device = this.discoveredDevices.get(targetDeviceId);
        if (device && device.address) {
          this.messageSocket?.send(
            buffer,
            0,
            buffer.length,
            MESSAGE_PORT,
            device.address,
            (err: any) => {
              if (err) console.error("Erreur envoi unicast:", err);
            }
          );
          return true;
        }
        return false;
      }

      // Broadcast
      this.messageSocket?.send(
        buffer,
        0,
        buffer.length,
        MESSAGE_PORT,
        '255.255.255.255',
        (err: any) => {
          if (err) console.error("Erreur envoi broadcast:", err);
        }
      );

      return true;
    } catch (error) {
      console.error("Erreur sendMessage:", error);
      return false;
    }
  }

  getDiscoveredDevices(): Device[] {
    return Array.from(this.discoveredDevices.values());
  }

  cleanup() {
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    this.discoverySocket?.close();
    this.messageSocket?.close();
    this.discoveredDevices.clear();
  }
}
