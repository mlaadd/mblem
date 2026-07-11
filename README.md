# 🃏 MBLEM

MBLEM is an Android app that lets two nearby players play the card game Mau-Mau together using Bluetooth Low Energy (BLE).

The app works entirely offline. Devices communicate directly over BLE, and no internet connection or sign-up is required.

The application is built with NativeScript and Svelte.

## Installation

[<img src="https://raw.githubusercontent.com/ImranR98/Obtainium/refs/heads/main/assets/graphics/badge_obtainium.png"
    alt="Get it on Obtainium"
    height="80">](https://apps.obtainium.page/redirect?r=obtainium://app/%7B%22id%22:%22dev.mlaadd.mblem%22,%22url%22:%22https://github.com/mlaadd/mblem%22,%22author%22:%22mlaadd%22,%22name%22:%22MBLEM%22%7D)

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

Run the app on a connected device or emulator with live reload (dev):

```sh
bun start
```

Build a debug APK:

```sh
bun run build
```

Build an optimized release APK - it ships only the 64-bit ARM (`arm64-v8a`) runtime.

```sh
bun run build:release
```

`build:release` builds in webpack production mode (minified/optimized). A keystore is required:

```sh
bun run build:release \
  --key-store-path <path> --key-store-password <password> \
  --key-store-alias <alias> --key-store-alias-password <password>
```

### Scripts

```sh
bun start             # ns run android (dev, live reload)
bun run build         # ns build android (debug APK)
bun run build:release # ns build android --release (optimized, production mode)
bun run lint          # ESLint
bun run typecheck     # tsc --noEmit (app + tests)
bun run format        # Prettier (write); use format:check in CI
bun test              # unit tests for the card / rules / protocol modules
```

CI (`.github/workflows/ci.yml`) runs the checks above.

### Architecture

The game logic is split into small, dependency-free modules so it can be unit-tested without NativeScript:

- `app/cards.ts` — card encoding and the deck.
- `app/rules.ts` — Mau-Mau rules (shared by the local player and the remote-move handler, so the two devices can't drift apart).
- `app/protocol.ts` — the BLE wire format.

The card encoding, message format, and BLE handshake are documented in [`docs/protocol.md`](docs/protocol.md).

> **Note:** moves are trusted, not validated on the receiving device — this is a friendly, same-room game, not an adversarial protocol. See the trust model in the protocol doc.
