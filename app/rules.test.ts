import { describe, expect, test } from "bun:test";
import { Rank, Suit } from "./cards";
import { canPlay, drawCount, DRAW_PENALTY_PER_SEVEN, keepsTurn, playDrawDelta } from "./rules";

const SEVEN_HEARTS = Rank.SEVEN + Suit.HEARTS;
const SEVEN_SPADES = Rank.SEVEN + Suit.SPADES;
const EIGHT_HEARTS = Rank.EIGHT + Suit.HEARTS;
const EIGHT_CLUBS = Rank.EIGHT + Suit.CLUBS;
const ACE_CLUBS = Rank.ACE + Suit.CLUBS;

describe("canPlay", () => {
  test("allows a matching suit", () => {
    expect(canPlay(SEVEN_HEARTS, EIGHT_HEARTS, 0)).toBe(true);
  });

  test("allows a matching rank", () => {
    expect(canPlay(EIGHT_HEARTS, EIGHT_CLUBS, 0)).toBe(true);
  });

  test("rejects a card that matches neither suit nor rank", () => {
    expect(canPlay(SEVEN_HEARTS, ACE_CLUBS, 0)).toBe(false);
  });

  test("with a pending seven stack, only another seven may be played", () => {
    // 8 of hearts matches the suit, but the stack forces a seven or a draw.
    expect(canPlay(SEVEN_HEARTS, EIGHT_HEARTS, DRAW_PENALTY_PER_SEVEN)).toBe(false);
    expect(canPlay(SEVEN_HEARTS, SEVEN_SPADES, DRAW_PENALTY_PER_SEVEN)).toBe(true);
  });

  test("without a pending stack, a normal card plays on a seven", () => {
    expect(canPlay(SEVEN_HEARTS, EIGHT_HEARTS, 0)).toBe(true);
  });
});

describe("playDrawDelta", () => {
  test("a seven adds two to the draw stack", () => {
    expect(playDrawDelta(SEVEN_SPADES)).toBe(DRAW_PENALTY_PER_SEVEN);
  });

  test("any other card adds nothing", () => {
    expect(playDrawDelta(EIGHT_HEARTS)).toBe(0);
    expect(playDrawDelta(ACE_CLUBS)).toBe(0);
  });
});

describe("keepsTurn", () => {
  test("an ace lets the player go again", () => {
    expect(keepsTurn(ACE_CLUBS)).toBe(true);
  });

  test("any other card passes the turn", () => {
    expect(keepsTurn(EIGHT_HEARTS)).toBe(false);
    expect(keepsTurn(SEVEN_SPADES)).toBe(false);
  });
});

describe("drawCount", () => {
  test("draws the whole pending stack when there is one", () => {
    expect(drawCount(4)).toBe(4);
    expect(drawCount(2)).toBe(2);
  });

  test("draws a single card when nothing is stacked", () => {
    expect(drawCount(0)).toBe(1);
  });
});
