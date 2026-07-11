import { Bluetooth } from "@nativescript-community/ble";
import { CHARACTERISTIC_UUID, SERVICE_UUID } from "./constants";
import { gameState, ready, connected, resetGameState } from "./gameState";
import { gameMessage, GameSignal } from "./protocol";
import { get, writable } from "svelte/store";

export const searchConnection = writable(false);
export const ble = new Bluetooth();
let peripheralUUID = "";

// Sends an already-encoded protocol message (see protocol.ts) over BLE.
// Returns whether the transport accepted it (no delivery guarantee)
export const write = async (message: Uint8Array): Promise<boolean> => {
  try {
    await ble.writeWithoutResponse({
      peripheralUUID,
      serviceUUID: SERVICE_UUID,
      characteristicUUID: CHARACTERISTIC_UUID,
      value: Array.from(message),
    });
    return true;
  } catch (e) {
    console.error("Sending message failed", e);
    return false;
  }
};

export const read = () => {
  return ble.read({
    peripheralUUID: peripheralUUID,
    serviceUUID: SERVICE_UUID,
    characteristicUUID: CHARACTERISTIC_UUID,
  });
};

export const disconnect = async () => {
  if (get(connected)) {
    console.log("!about to disconnect");
    await write(gameMessage(GameSignal.DISCONNECTING));
  }
  connected.set(false);
  await ble.disconnect({
    UUID: peripheralUUID,
  });
  console.log("Gracefully disconnected");
  return true;
};

export const requestMtu = async () => {
  return await ble.requestMtu({
    value: 100,
    peripheralUUID,
  });
};

export async function scanAndConnect() {
  console.log("Scanning for players...");
  resetGameState();
  searchConnection.set(true);
  let foundSomeone = false;

  await ble.startScanning({
    seconds: 10,
    filters: [{ serviceUUID: SERVICE_UUID }],
    onDiscovered: async function (peripheral) {
      gameState.connecting = true;
      foundSomeone = true;
      await ble.stopScanning();
      await ble.connect({
        UUID: peripheral.UUID,
        onConnected: async function (peripheral) {
          connected.set(true);
          peripheralUUID = peripheral.UUID;
          await requestMtu();
          await write(gameMessage(GameSignal.CONNECTING));
        },
        onDisconnected: function (peripheral) {
          console.log("Peripheral disconnected with UUID: " + peripheral.UUID, peripheralUUID);
          searchConnection.set(false);
          ready.set(false);
        },
      });
    },
  });
  if (!foundSomeone) {
    console.log("No players found");
    searchConnection.set(false);
  }
}
