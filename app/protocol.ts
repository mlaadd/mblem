// BLE wire protocol. Every message is `<TYPE>:<payload>`, an ASCII-encoded tag,
// the ':' separator byte, then the raw payload bytes.

const SEPARATOR = 0x3a; // ':'

export const MessageType = {
  GAME: "GAME",
  SEED: "SEED",
  PLAY: "PLAY",
} as const;

// GAME payloads: connection-lifecycle signals exchanged during the handshake.
export const GameSignal = {
  CONNECTING: "CONNECTING",
  READY: "READY",
  DISCONNECTING: "DISCONNECTING",
} as const;
export type GameSignal = (typeof GameSignal)[keyof typeof GameSignal];

// PLAY payload meaning "I drew a card instead of playing one".
export const PLAY_DRAW = -1;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface Message {
  type: string;
  payload: Uint8Array;
}

// Builds `<type>:<payload>` as a byte array ready to hand to the BLE write.
function encodeMessage(type: string, payload: Uint8Array = new Uint8Array(0)): Uint8Array {
  const head = encoder.encode(type + ":");
  const out = new Uint8Array(head.length + payload.length);
  out.set(head, 0);
  out.set(payload, head.length);
  return out;
}

export const gameMessage = (signal: GameSignal): Uint8Array => encodeMessage(MessageType.GAME, encoder.encode(signal));
export const seedMessage = (seed: Uint8Array): Uint8Array => encodeMessage(MessageType.SEED, seed);
export const playMessage = (cardIndex: number): Uint8Array =>
  encodeMessage(MessageType.PLAY, encoder.encode(String(cardIndex)));

// Splits a received message into its type tag and payload, or null if malformed.
export function parseMessage(bytes: Uint8Array): Message | null {
  const index = bytes.indexOf(SEPARATOR);
  if (index === -1) return null;
  return {
    type: decoder.decode(bytes.slice(0, index)),
    payload: bytes.slice(index + 1),
  };
}

// The GATT read characteristic reports whether the peripheral is mid-connection
// as the ASCII string "true"/"false"; the leading 't' is enough to tell.
export const isConnectingResponse = (bytes: Uint8Array): boolean => bytes[0] === 0x74; // 't'
