import { disconnect, read, write } from "./ble";
import { toggleAdvertising } from "./blePeripheral";
import { buildDeck, NO_CARD } from "./cards";
import { drawCount, keepsTurn, playDrawDelta } from "./rules";
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
  const colon = 58;
  const index = binary.indexOf(colon);

  if (index === -1) {
    console.error("Invalid message, no colon:", binary);
    return;
  }
  const typeBytes = binary.slice(0, index);
  const msgBytes = binary.slice(index + 1);

  const decoder = new TextDecoder();
  const type = decoder.decode(typeBytes);

  if (type === "GAME") {
    const msg = decoder.decode(msgBytes);
    switch (msg) {
      case "CONNECTING": {
        let i = 0;
        if (lastInterval) {
          clearInterval(lastInterval);
        }
        lastInterval = setInterval(async () => {
          try {
            const remoteState = await read();
            const res = new Uint8Array(remoteState.value);
            if (res[0] === 116) {
              clearInterval(lastInterval);
              toggleAdvertising(false);
              await write("GAME:READY");
            }
          } catch {
            if (++i > 20) {
              clearInterval(lastInterval);
              console.warn("This device didn't initiate a connection.");
            }
          }
        }, 1000);
        break;
      }
      case "READY":
        if (get(connected)) {
          const thisSeed = new Uint8Array(32);
          crypto.getRandomValues(thisSeed);
          gameState.seeds[0] = thisSeed;
          await write("SEED:", thisSeed);
        } else {
          console.warn("Not ready, this device is already disconnected.");
        }
        break;
      case "DISCONNECTING":
        clearInterval(lastInterval);
        if (get(connected)) {
          await disconnect();
        } else {
          console.warn("No disconnect needed, this device is already disconnected.");
        }
        break;
    }
  } else if (type === "SEED") {
    try {
      gameState.seeds[1] = msgBytes;
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
          for (let i = get(cards).length - 1; i > 0; i--) {
            const seed = combinedSeed[get(cards).length - i];
            const j = seed % (i + 1);

            [cardsCache[i], cardsCache[j]] = [cardsCache[j], cardsCache[i]];
          }
          cards.set(cardsCache);
          console.info("You are Player", gameState.player);
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
      console.error(e);
    }
  } else if (type === "PLAY") {
    const msg = +decoder.decode(msgBytes);
    if (msg === -1) {
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
