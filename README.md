# 🃏 MBLEM

MBLEM is an Android app that lets two nearby players play the card game Mau-Mau together using Bluetooth Low Energy (BLE).

The app works entirely offline. Devices communicate directly over BLE, and no internet connection or sign-up is required.

The application is built with NativeScript and Svelte.

## Installation

[<img src="https://raw.githubusercontent.com/ImranR98/Obtainium/refs/heads/main/assets/graphics/badge_obtainium.png"
    alt="Get it on Obtainium"
    height="80">](https://apps.obtainium.imranr.dev/redirect.html?r=obtainium://add/https://github.com/mlaadd/mblem)

Or download the APK from [Releases](https://github.com/mlaadd/mblem/releases).

## Development

### Requirements

To set up the development environment, follow the official NativeScript documentation:

https://docs.nativescript.org/setup/

This project uses [Bun](https://bun.sh) as its package manager and task runner. Install dependencies with:

```sh
bun install
```

### Usage

Build the Android application:

```sh
ns build android
```

To run the application directly on a connected device:

```sh
ns run android
```

### Scripts

```sh
bun run lint          # ESLint
bun run typecheck     # tsc --noEmit
bun run format        # Prettier (write); use format:check in CI
bun test              # unit tests for the card / rules / protocol modules
```

CI (`.github/workflows/ci.yml`) runs the checks above and builds the APK on every push and pull request.

### Architecture

The game logic is split into small, dependency-free modules so it can be unit-tested without NativeScript:

- `app/cards.ts` — card encoding and the deck.
- `app/rules.ts` — Mau-Mau rules (shared by the local player and the remote-move handler, so the two devices can't drift apart).
- `app/protocol.ts` — the BLE wire format.

The card encoding, message format, and BLE handshake are documented in [`docs/protocol.md`](docs/protocol.md).

> **Note:** moves are trusted, not validated on the receiving device — this is a friendly, same-room game, not an adversarial protocol. See the trust model in the protocol doc.
