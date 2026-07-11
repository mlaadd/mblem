import { describe, expect, test } from "bun:test";
import {
  buildDeck,
  cardToUnicode,
  CARD_BACK,
  isAce,
  isRed,
  isSeven,
  NO_CARD,
  Rank,
  rankOf,
  Suit,
  suitOf,
} from "./cards";

describe("card encoding", () => {
  test("suit and rank split the byte's nibbles", () => {
    const sevenOfHearts = Rank.SEVEN + Suit.HEARTS; // 0x17
    expect(rankOf(sevenOfHearts)).toBe(Rank.SEVEN);
    expect(suitOf(sevenOfHearts)).toBe(Suit.HEARTS);
  });

  test("isSeven / isAce match only their rank, ignoring suit", () => {
    expect(isSeven(Rank.SEVEN + Suit.CLUBS)).toBe(true);
    expect(isSeven(Rank.EIGHT + Suit.CLUBS)).toBe(false);
    expect(isAce(Rank.ACE + Suit.DIAMONDS)).toBe(true);
    expect(isAce(Rank.KING + Suit.DIAMONDS)).toBe(false);
  });

  test("hearts and diamonds are red; spades and clubs are not", () => {
    expect(isRed(Rank.TEN + Suit.HEARTS)).toBe(true);
    expect(isRed(Rank.TEN + Suit.DIAMONDS)).toBe(true);
    expect(isRed(Rank.TEN + Suit.SPADES)).toBe(false);
    expect(isRed(Rank.TEN + Suit.CLUBS)).toBe(false);
  });
});

describe("buildDeck", () => {
  test("produces 32 unique cards (8 ranks x 4 suits)", () => {
    const deck = buildDeck();
    expect(deck.length).toBe(32);
    expect(new Set(deck).size).toBe(32);
  });

  test("is deterministic so both devices derive the same deck", () => {
    expect(buildDeck()).toEqual(buildDeck());
  });

  test("every card decomposes into a known rank and suit", () => {
    const ranks = new Set<number>(Object.values(Rank));
    const suits = new Set<number>(Object.values(Suit));
    for (const card of buildDeck()) {
      expect(ranks.has(rankOf(card))).toBe(true);
      expect(suits.has(suitOf(card))).toBe(true);
    }
  });
});

describe("display", () => {
  test("cardToUnicode maps onto the Unicode playing-card block", () => {
    // U+1F0A1 is the ace of spades; the back (offset 0) is U+1F0A0.
    expect(cardToUnicode(Rank.ACE + Suit.SPADES)).toBe(String.fromCodePoint(0x1f0a1));
    expect(CARD_BACK).toBe(String.fromCodePoint(0x1f0a0));
  });

  test("NO_CARD sentinel is distinct from any real deck card", () => {
    expect(buildDeck()).not.toContain(NO_CARD);
  });
});
