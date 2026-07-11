// A card is a single byte: the high nibble is the suit, the low
// nibble is the rank (e.g. 0x17 = hearts seven).

export const SUIT_MASK = 0xf0;
export const RANK_MASK = 0x0f;

// Marker in game state for "no card yet".
export const NO_CARD = 0xff;

// Ranks (low nibble). Only ACE and SEVEN carry special rules; the rest are
// ordinary cards. This is a 32-card Bavarian-style deck, so there is a KNIGHT
// instead of a queen and no pip cards below the seven.
export const Rank = {
  ACE: 0x1,
  SEVEN: 0x7,
  EIGHT: 0x8,
  NINE: 0x9,
  TEN: 0xa,
  JACK: 0xb,
  KNIGHT: 0xc,
  KING: 0xe,
} as const;

// Suits (high nibble). Hearts and diamonds are the red suits.
export const Suit = {
  SPADES: 0x00,
  HEARTS: 0x10,
  DIAMONDS: 0x20,
  CLUBS: 0x30,
} as const;

export const suitOf = (card: number): number => card & SUIT_MASK;
export const rankOf = (card: number): number => card & RANK_MASK;

export const isSeven = (card: number): boolean => rankOf(card) === Rank.SEVEN;
export const isAce = (card: number): boolean => rankOf(card) === Rank.ACE;
export const isRed = (card: number): boolean => suitOf(card) === Suit.HEARTS || suitOf(card) === Suit.DIAMONDS;

const RANKS = [Rank.ACE, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.KNIGHT, Rank.KING];
const SUITS = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];

// The 32-card deck in canonical (unshuffled) order. Both devices must build it
// identically so the seeded shuffle derives the same deck on each side.
export const buildDeck = (): number[] => RANKS.flatMap((rank) => SUITS.map((suit) => rank + suit));

// Display: the card byte is an offset into the Unicode playing-card block, whose
// first code point (U+1F0A0) is the face-down card back.
export const CARD_UNICODE_OFFSET = 0x1f0a0;
export const cardToUnicode = (card: number): string => String.fromCodePoint(CARD_UNICODE_OFFSET + card);

// Glyph for a face-down card (U+1F0A0).
export const CARD_BACK = cardToUnicode(0);
