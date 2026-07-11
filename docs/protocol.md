# MBLEM protocol & card encoding

Two phones play one game of Mau-Mau over Bluetooth Low Energy, with no server.
This document describes the two non-obvious parts of the codebase: how a card is
encoded as a single byte, and how the devices talk to each other.

## Card encoding (`app/cards.ts`)

A card is one byte. The **high nibble is the suit**, the **low nibble is the
rank**:

```
  0x17  =  0x10 (hearts)  |  0x7 (seven)  =  seven of hearts
```

| Suit     | Value  | Colour |
| -------- | ------ | ------ |
| Spades   | `0x00` | black  |
| Hearts   | `0x10` | red    |
| Diamonds | `0x20` | red    |
| Clubs    | `0x30` | black  |

| Rank  | Value | Rank   | Value |
| ----- | ----- | ------ | ----- |
| Ace   | `0x1` | Jack   | `0xb` |
| Seven | `0x7` | Knight | `0xc` |
| Eight | `0x8` | King   | `0xe` |
| Nine  | `0x9` |        |       |
| Ten   | `0xa` |        |       |

This is a 32-card Bavarian-style deck (8 ranks × 4 suits): there is a **Knight**
rather than a queen, and no pip cards below the seven.

The byte doubles as a display index: it is an offset into the Unicode
playing-card block, whose first code point (`U+1F0A0`) is the face-down card
back. `cardToUnicode(card)` renders a card; `CARD_BACK` is the back glyph.

`NO_CARD` (`0xff`) is a state sentinel meaning "no card yet" — it is not a real
card and never appears in the deck.

### Special ranks (`app/rules.ts`)

- **Seven** — the next player must draw two cards, unless they stack their own
  seven (the penalty accumulates: two sevens ⇒ draw four, and so on).
- **Ace** — the player who plays it takes another turn.

## BLE setup

Every device does two things at once (see `app/app.ts`):

- **advertises** a GATT server (`app/blePeripheral.ts`) exposing one service
  (`SERVICE_UUID`) with one read/write characteristic (`CHARACTERISTIC_UUID`), and
- **scans** for that same service and connects when it finds a peer
  (`app/ble.ts`).

Messages are sent with `writeWithoutResponse`. The characteristic's **read**
value is the peripheral's `connecting` flag, encoded as the ASCII string
`"true"`/`"false"`; it is used during the handshake to confirm a peer initiated
the link.

## Message format (`app/protocol.ts`)

Each message is `<TYPE>:<payload>` — an ASCII type tag, the `:` separator byte
(`0x3a`), then the raw payload bytes. Only the first `:` is treated as the
separator, so binary payloads may themselves contain `0x3a`.

| Message              | Payload                                       | Meaning                                  |
| -------------------- | --------------------------------------------- | ---------------------------------------- |
| `GAME:CONNECTING`    | —                                             | A device has initiated a connection.     |
| `GAME:READY`         | —                                             | Link confirmed; start the seed exchange. |
| `GAME:DISCONNECTING` | —                                             | Graceful teardown.                       |
| `SEED:<32 bytes>`    | 32 random bytes                               | This device's half of the shuffle seed.  |
| `PLAY:<n>`           | ASCII integer: hand index, or `-1` for a draw | The opponent played card `n`, or drew.   |

## Handshake & shuffle

1. Both devices advertise and scan. When one connects to the other it marks
   itself `connecting` and sends `GAME:CONNECTING`.
2. The receiver polls the peer's read characteristic until it reports `"true"`,
   confirming the peer initiated, then stops advertising and replies
   `GAME:READY`.
3. On `GAME:READY`, a device generates 32 random bytes and sends them as `SEED:`.
4. Each device now has both seeds. It **XORs** them into a combined seed (XOR is
   commutative, so both devices derive the same value) and runs a deterministic
   Fisher–Yates shuffle of `buildDeck()`. Because the deck order, the seed, and
   the shuffle are identical on both sides, **the full deck is never transmitted**
   — each device reconstructs it.
5. Player order is decided by comparing the two seeds byte-by-byte. The deal is
   mirrored (player 1's hand is player 2's opponent hand, and vice versa) so both
   devices agree on every hand, the top card, and the draw pile.

## Trust model

Each device computes its own hand and the deck locally and trusts the `PLAY`
messages it receives — moves are **not** validated against the rules on the
receiving side. This is a deliberate trade-off for a friendly, same-room game: a
modified client could cheat. Do not treat this as a competitive or adversarial
protocol.
