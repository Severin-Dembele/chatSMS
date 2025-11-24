import { NetworkService } from './NetworkService';
import { BluetoothService } from './BluetoothService';
import { ChatMessage, Device, ConnectionType } from '../types';

export class CommunicationService {
  private networkService: NetworkService;
  private bluetoothService: BluetoothService;
  private activeConnectionType: ConnectionType = 'wifi';
  private deviceId: string;
  private deviceName: string;

  constructor(deviceId: string, deviceName: string) {
    this.deviceId = deviceId;
    this.deviceName = deviceName;
    this.networkService = new NetworkService(deviceId, deviceName);
    this.bluetoothService = new BluetoothService(deviceId, deviceName);
  }

  async initialize(
    onMessageReceived: (message: ChatMessage) => void,
    onDeviceDiscovered: (device: Device) => void
  ): Promise<{ wifi: boolean; bluetooth: boolean }> {
    const wifiInitialized = await this.networkService.initialize(
      onMessageReceived,
      onDeviceDiscovered
    );

    const bluetoothInitialized = await this.bluetoothService.initialize(
      onMessageReceived,
      onDeviceDiscovered
    );

    // Par défaut, utiliser WiFi si disponible, sinon Bluetooth
    if (wifiInitialized) {
      this.activeConnectionType = 'wifi';
    } else if (bluetoothInitialized) {
      this.activeConnectionType = 'bluetooth';
    }

    return {
      wifi: wifiInitialized,
      bluetooth: bluetoothInitialized,
    };
  }

  setActiveConnectionType(type: ConnectionType): void {
    this.activeConnectionType = type;
  }

  getActiveConnectionType(): ConnectionType {
    return this.activeConnectionType;
  }

  async sendMessage(message: ChatMessage, targetDeviceId?: string): Promise<boolean> {
    if (this.activeConnectionType === 'wifi') {
      return await this.networkService.sendMessage(message, targetDeviceId);
    } else {
      return await this.bluetoothService.sendMessage(message, targetDeviceId);
    }
  }

  async startBluetoothScanning(): Promise<void> {
    await this.bluetoothService.startScanning();
  }

  stopBluetoothScanning(): void {
    this.bluetoothService.stopScanning();
  }

  async connectToBluetoothDevice(deviceId: string): Promise<boolean> {
    return await this.bluetoothService.connectToDevice(deviceId);
  }

  async disconnectFromBluetoothDevice(deviceId: string): Promise<void> {
    await this.bluetoothService.disconnectFromDevice(deviceId);
  }

  getDiscoveredDevices(): Device[] {
    if (this.activeConnectionType === 'wifi') {
      return this.networkService.getDiscoveredDevices();
    } else {
      return [];
    }
  }

  getConnectedBluetoothDevices(): string[] {
    return this.bluetoothService.getConnectedDevices();
  }

  cleanup(): void {
    this.networkService.cleanup();
    this.bluetoothService.cleanup();
  }
}
