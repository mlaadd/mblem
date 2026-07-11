import { Utils } from "@nativescript/core";
import { CHARACTERISTIC_UUID, SERVICE_UUID } from "./constants";
import { gameState, handleMessage } from "./gameState";
import { disconnect, searchConnection } from "./ble";
import { error, log, warn } from "./logger";

let advertiser: android.bluetooth.le.BluetoothLeAdvertiser;
export let gattServer: android.bluetooth.BluetoothGattServer;
let isAdvertising = false;
let characteristic: android.bluetooth.BluetoothGattCharacteristic;
let advertiseCallback: AdvertiseCallback | undefined;

@NativeClass()
class BluetoothGattServerCallback extends android.bluetooth.BluetoothGattServerCallback {
  constructor() {
    super();
    return globalThis.__native(this);
  }

  onConnectionStateChange(device: android.bluetooth.BluetoothDevice, status: number, newState: number): void {
    log("Connection state change:", device.getAddress(), newState);
  }

  onCharacteristicReadRequest(
    device: android.bluetooth.BluetoothDevice,
    requestId: number,
    offset: number,
    characteristic: android.bluetooth.BluetoothGattCharacteristic,
  ): void {
    log("Read request:", characteristic.getUuid().toString(), gameState.connecting);
    const value = new java.lang.String(gameState.connecting.toString()).getBytes();
    gattServer.sendResponse(device, requestId, android.bluetooth.BluetoothGatt.GATT_SUCCESS, 0, value);
  }

  onCharacteristicWriteRequest(
    device: android.bluetooth.BluetoothDevice,
    requestId: number,
    characteristic: android.bluetooth.BluetoothGattCharacteristic,
    preparedWrite: boolean,
    responseNeeded: boolean,
    offset: number,
    value: androidNative.Array<number>,
  ): void {
    if (preparedWrite) {
      error("Prepared Write not allowed!");
    }
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) {
      // value is signed, make it unsigned
      bytes[i] = value[i] & 0xff;
    }
    log("Writes received:", bytes);
    if (responseNeeded) {
      gattServer.sendResponse(device, requestId, android.bluetooth.BluetoothGatt.GATT_SUCCESS, 0, value);
    }
    handleMessage(bytes).then(() => {});
  }
}

@NativeClass()
class AdvertiseCallback extends android.bluetooth.le.AdvertiseCallback {
  constructor() {
    super();
    return globalThis.__native(this);
  }

  onStartSuccess(): void {
    log("BLE Advertising started");
  }

  onStartFailure(errorCode: number): void {
    searchConnection.set(false);
    log("BLE Advertising failed:", errorCode);
  }
}

export async function initializeGattServer() {
  if (advertiser) {
    log("GATT Server already initialized...");
    return;
  }
  const context = Utils.android.getApplicationContext();
  const bluetoothManager = context.getSystemService(
    android.content.Context.BLUETOOTH_SERVICE,
  ) as android.bluetooth.BluetoothManager;
  const adapter = bluetoothManager.getAdapter();

  advertiser = adapter.getBluetoothLeAdvertiser();

  const serviceUUID = java.util.UUID.fromString(SERVICE_UUID);
  const charUUID = java.util.UUID.fromString(CHARACTERISTIC_UUID);

  characteristic = new android.bluetooth.BluetoothGattCharacteristic(
    charUUID,
    android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ |
      android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE,
    android.bluetooth.BluetoothGattCharacteristic.PERMISSION_READ |
      android.bluetooth.BluetoothGattCharacteristic.PERMISSION_WRITE,
  );

  const service = new android.bluetooth.BluetoothGattService(
    serviceUUID,
    android.bluetooth.BluetoothGattService.SERVICE_TYPE_PRIMARY,
  );
  service.addCharacteristic(characteristic);

  gattServer = bluetoothManager.openGattServer(context, new BluetoothGattServerCallback());
  gattServer.addService(service);

  log("GATT server initialized successfully");
}

function stopAdvertising() {
  if (advertiseCallback) {
    advertiser.stopAdvertising(advertiseCallback);
    advertiseCallback = undefined;
  }
  isAdvertising = false;
  log("Stopped Advertising");
}

export function toggleAdvertising(isOn: boolean, timeout: number = 5) {
  if (isOn) {
    log("Started Advertising");
    const serviceUUID = java.util.UUID.fromString(SERVICE_UUID);
    const settings = new android.bluetooth.le.AdvertiseSettings.Builder()
      .setAdvertiseMode(android.bluetooth.le.AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setConnectable(true)
      .build();

    const data = new android.bluetooth.le.AdvertiseData.Builder()
      .addServiceUuid(new android.os.ParcelUuid(serviceUUID))
      .setIncludeDeviceName(true)
      .build();

    advertiseCallback = new AdvertiseCallback();
    advertiser.startAdvertising(settings, data, advertiseCallback);
    isAdvertising = true;

    setTimeout(() => {
      if (isAdvertising) {
        if (gameState.connecting) {
          warn("Connection Timeout!");
          disconnect();
        }
        stopAdvertising();
      }
    }, timeout * 1000);
  } else {
    if (isAdvertising) {
      stopAdvertising();
    }
  }
}
