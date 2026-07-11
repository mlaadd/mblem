// Mau-Mau rules as pure functions, shared by the local player's actions
// and the handler that applies the opponent's moves.
// Keeping the rules in one place means the two devices can
// never drift out of sync.

import { isAce, isSeven, rankOf, suitOf } from "./cards";

// Each seven played forces the next player to draw two more cards, unless they
// stack another seven of their own.
export const DRAW_PENALTY_PER_SEVEN = 2;

// Whether `card` may be played on top of `top`, given the pending draw stack
// (`drawAcc`, the number of cards owed from stacked sevens).
export const canPlay = (top: number, card: number, drawAcc: number): boolean => {
  const matches = suitOf(top) === suitOf(card) || rankOf(top) === rankOf(card);
  if (!matches) return false;
  // While a seven stack is pending, only another seven can be played.
  if (isSeven(top) && drawAcc > 0 && !isSeven(card)) return false;
  return true;
};

// How much the pending draw stack grows when `card` is played.
export const playDrawDelta = (card: number): number => (isSeven(card) ? DRAW_PENALTY_PER_SEVEN : 0);

// An ace lets the same player play again; every other card passes the turn.
export const keepsTurn = (card: number): boolean => isAce(card);

// How many cards a drawing player must take: the whole pending stack, or one.
export const drawCount = (drawAcc: number): number => Math.max(drawAcc, 1);
