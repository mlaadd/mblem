import { describe, expect, test } from "bun:test";
import {
  gameMessage,
  GameSignal,
  isConnectingResponse,
  MessageType,
  parseMessage,
  playMessage,
  PLAY_DRAW,
  seedMessage,
} from "./protocol";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("parseMessage", () => {
  test("round-trips a GAME signal", () => {
    const parsed = parseMessage(gameMessage(GameSignal.READY));
    expect(parsed?.type).toBe(MessageType.GAME);
    expect(decode(parsed!.payload)).toBe(GameSignal.READY);
  });

  test("round-trips a PLAY card index", () => {
    const parsed = parseMessage(playMessage(5));
    expect(parsed?.type).toBe(MessageType.PLAY);
    expect(decode(parsed!.payload)).toBe("5");
  });

  test("encodes the draw sentinel as -1", () => {
    expect(decode(parseMessage(playMessage(PLAY_DRAW))!.payload)).toBe("-1");
  });

  test("returns the raw seed bytes untouched", () => {
    const seed = new Uint8Array([1, 2, 3, 250, 255]);
    const parsed = parseMessage(seedMessage(seed));
    expect(parsed?.type).toBe(MessageType.SEED);
    expect(Array.from(parsed!.payload)).toEqual(Array.from(seed));
  });

  test("only splits on the first separator, so payloads may contain ':'", () => {
    const seed = new Uint8Array([0x3a, 0x00, 0x3a, 0xff]); // 0x3a === ':'
    const parsed = parseMessage(seedMessage(seed));
    expect(parsed?.type).toBe(MessageType.SEED);
    expect(Array.from(parsed!.payload)).toEqual(Array.from(seed));
  });

  test("returns null when there is no separator", () => {
    expect(parseMessage(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("isConnectingResponse", () => {
  test("reads the ASCII 'true'/'false' flag by its first byte", () => {
    expect(isConnectingResponse(new TextEncoder().encode("true"))).toBe(true);
    expect(isConnectingResponse(new TextEncoder().encode("false"))).toBe(false);
  });
});
