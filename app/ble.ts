import { Bluetooth } from "@nativescript-community/ble";
import { CHARACTERISTIC_UUID, SERVICE_UUID } from "./constants";
import { gameState, ready, connected, selfHand, oppHand } from "./gameState";
import { get, writable } from "svelte/store";

export const searchConnection = writable(false);
export const ble = new Bluetooth();
export let peripheralUUID = "";

export const write = async (command: string, binary: Uint8Array = new Uint8Array(0)) => {
  const encoded = command
    .split("")
    .map((e) => e.charCodeAt(0))
    .concat([...binary]);
  console.log("about to send", command);
  if (binary.length > 0) console.log("with binary", binary);
  try {
    await ble.writeWithoutResponse({
      peripheralUUID: peripheralUUID,
      serviceUUID: SERVICE_UUID,
      characteristicUUID: CHARACTERISTIC_UUID,
      value: encoded,
    });
  } catch {
    console.error("Sending message failed", command, binary);
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
    await write("GAME:DISCONNECTING");
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
  gameState.connecting = false;
  searchConnection.set(true);
  let foundSomeone = false;
  gameState.seeds = [new Uint8Array(), new Uint8Array()];
  selfHand.set([0xff]);
  oppHand.set([0xff]);

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
          await write("GAME:CONNECTING");
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
