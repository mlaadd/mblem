import { disconnect, read, write } from "./ble";
import { toggleAdvertising } from "./blePeripheral";
import { buildDeck, NO_CARD } from "./cards";
import { drawCount, keepsTurn, playDrawDelta } from "./rules";
import {
  gameMessage,
  GameSignal,
  isConnectingResponse,
  MessageType,
  parseMessage,
  PLAY_DRAW,
  seedMessage,
} from "./protocol";
import { error, info, warn } from "./logger";
import { get, writable } from "svelte/store";

let lastInterval: number;
export const ready = writable(false);
export const connected = writable(false);
export const turn = writable(false);
export const selfHand = writable([NO_CARD]);
export const oppHand = writable([NO_CARD]);
export const topCard = writable(NO_CARD);
export const cards = writable([NO_CARD]);

function combineSeeds(seedA: Uint8Array, seedB: Uint8Array) {
  const combined = new Uint8Array(seedA.length);
  for (let i = 0; i < seedA.length; i++) {
    combined[i] = seedA[i] ^ seedB[i];
  }
  return combined;
}

export const handleMessage = async (binary: Uint8Array) => {
  const message = parseMessage(binary);
  if (!message) {
    error("Invalid message, no separator:", binary);
    return;
  }
  const { type, payload } = message;

  if (type === MessageType.GAME) {
    const signal = new TextDecoder().decode(payload);
    switch (signal) {
      case GameSignal.CONNECTING: {
        let i = 0;
        if (lastInterval) {
          clearInterval(lastInterval);
        }
        lastInterval = setInterval(async () => {
          try {
            const remoteState = await read();
            const res = new Uint8Array(remoteState.value);
            if (isConnectingResponse(res)) {
              clearInterval(lastInterval);
              toggleAdvertising(false);
              await write(gameMessage(GameSignal.READY));
            }
          } catch {
            if (++i > 20) {
              clearInterval(lastInterval);
              warn("This device didn't initiate a connection.");
            }
          }
        }, 1000);
        break;
      }
      case GameSignal.READY:
        if (get(connected)) {
          const thisSeed = new Uint8Array(32);
          crypto.getRandomValues(thisSeed);
          gameState.seeds[0] = thisSeed;
          await write(seedMessage(thisSeed));
        } else {
          warn("Not ready, this device is already disconnected.");
        }
        break;
      case GameSignal.DISCONNECTING:
        clearInterval(lastInterval);
        if (get(connected)) {
          await disconnect();
        } else {
          warn("No disconnect needed, this device is already disconnected.");
        }
        break;
    }
  } else if (type === MessageType.SEED) {
    try {
      // Copy into a fresh buffer so we don't retain the BLE transport array and
      // the seed type matches gameState.seeds (Uint8Array<ArrayBuffer>).
      gameState.seeds[1] = new Uint8Array(payload);
      const interval = setInterval(() => {
        if (gameState.seeds.filter((e) => e.length > 0).length > 1) {
          resetCards();
          clearInterval(interval);
          const combinedSeed = combineSeeds(gameState.seeds[0], gameState.seeds[1]);
          // determine who is player 1 and 2:
          for (let i = 0; i < gameState.seeds[0].length; i++) {
            if (gameState.seeds[0][i] !== gameState.seeds[1][i]) {
              gameState.player = gameState.seeds[0][i] > gameState.seeds[1][i] ? 1 : 2;
              break;
            }
          }
          const cardsCache = get(cards);
          for (let i = cardsCache.length - 1; i > 0; i--) {
            const seed = combinedSeed[cardsCache.length - i];
            const j = seed % (i + 1);

            [cardsCache[i], cardsCache[j]] = [cardsCache[j], cardsCache[i]];
          }
          cards.set(cardsCache);
          info("You are Player", gameState.player);
          if (gameState.player === 1) {
            turn.set(true);
          } else turn.set(false);
          cards.update((c) => {
            selfHand.set(c.splice(5 * (gameState.player - 1), 5));
            oppHand.set(c.splice(0, 5));
            topCard.set(c.shift() || 0);
            return c;
          });
          ready.set(true);
        }
      }, 100);
    } catch (e) {
      error(e);
    }
  } else if (type === MessageType.PLAY) {
    const msg = +new TextDecoder().decode(payload);
    if (msg === PLAY_DRAW) {
      turn.set(true);
      const numToDraw = drawCount(gameState.drawAcc);
      cards.update((c) => {
        oppHand.set(get(oppHand).concat(c.splice(0, numToDraw)));
        return c;
      });
      gameState.drawAcc = 0;
    } else {
      const played = get(oppHand)[msg];
      cards.update((c) => {
        c.push(get(topCard));
        return c;
      });
      topCard.set(played);
      if (!keepsTurn(played)) turn.set(true);
      gameState.drawAcc += playDrawDelta(played);
      oppHand.set(get(oppHand).filter((_, i) => i !== msg));
    }
  }
};

export const gameState = {
  connecting: false,
  seeds: [new Uint8Array(), new Uint8Array()],
  player: 0,
  gaveup: false,
  drawAcc: 0,
};

export const resetGameState = () => {
  gameState.connecting = false;
  gameState.seeds = [new Uint8Array(), new Uint8Array()];
  gameState.player = 0;
  gameState.gaveup = false;
  gameState.drawAcc = 0;
  ready.set(false);
  turn.set(false);
  selfHand.set([NO_CARD]);
  oppHand.set([NO_CARD]);
};

export const resetCards = () => {
  cards.set(buildDeck());
};
