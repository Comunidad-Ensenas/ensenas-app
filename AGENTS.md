Purpose
- Short, high-signal notes for an OpenCode agent working in this repository. Keep only repo-specific gotchas an agent would likely miss.

Quick setup
- Preferred package manager: pnpm (pnpm-lock.yaml is present). Use `pnpm install` then `pnpm run <script>` (scripts in package.json). Using the package.json scripts preserves NODE_OPTIONS (see `start`).
- Start dev server: `pnpm run start` (same as `expo start`).
- Run on Android emulator: `pnpm run android` (this runs `expo start --android`).
- Run on iOS (requires native toolchain/Xcode): `pnpm run ios` (this runs `expo run:ios`).
- Web: `pnpm run web` (expo web target).

Project type and entrypoints
- Expo React Native app using expo-router. package.json `main` is `expo-router/entry` and the app directory is `app/` (file-based routing). The router entry and routing setup live in `app/_layout.tsx`.
- The app selects an initial stack based on EXPO_PUBLIC_APP_MODE (see `app/_layout.tsx`). A repo .env with `EXPO_PUBLIC_APP_MODE="studio"` exists — changing or removing it alters initial routing.

Native & build notes
- This repo uses native modules (react-native-vision-camera, react-native-fast-tflite, expo-dev-client). To run on device/emulator you may need to build native clients (dev client / run:ios / run:android) and have the native toolchain installed.
- EAS config exists (eas.json). EAS CLI version requirement: `>= 18.4.0` (see eas.json -> cli.version).

Database / migrations
- Drizzle is configured for Expo SQLite: `drizzle.config.ts` uses `dialect: 'sqlite'` and `driver: 'expo'`.
- The file `drizzle/migrations.js` is required at runtime for the Expo SQLite migrator (it imports the .sql migration assets). Do not remove/rename it. The app calls `useMigrations(db, migrations)` in `app/_layout.tsx` and will block routing until migrations succeed.
- SQL files are imported directly (see `drizzle/migrations.js`) — the repo relies on a Babel plugin that inlines `.sql` imports (see `babel.config.js`).

Babel / Metro quirks
- Babel plugins in use (do not remove):
  - `inline-import` for `.sql` files — needed by the migrations import pattern.
  - `react-native-worklets-core/plugin` — required for worklets.
- Metro has extra assetExts added: `task`, `wasm`, `bin` (see `metro.config.js`). If you add binary asset types, ensure metro is configured accordingly.

TypeScript / imports
- tsconfig extends `expo/tsconfig.base`. There is a path alias: `@/*` -> `./*`. Prefer `@/` imports for repo-local absolute paths.

Environment files
- There is a committed `.env` with `EXPO_PUBLIC_APP_MODE="studio"`. Note `.gitignore` lists `.env` (local .env files are intentionally ignored), but the repo currently contains a .env. Do NOT store secrets in `.env` in this repo; local `.env` files are ignored by git by default.

Do not edit without checking
- `drizzle/migrations.js` — required for runtime migrations (Expo + sqlite). Keep the import pattern for the .sql assets.
- `babel.config.js` plugins and `metro.config.js` assetExts — removing these will break migration imports and runtime native/binary assets.

Common commands summary
- Install: `pnpm install`
- Dev server: `pnpm run start`
- Android emulator: `pnpm run android`
- iOS (mac + Xcode): `pnpm run ios`
- Web: `pnpm run web`

Where to look next
- App routing and runtime boot: `app/_layout.tsx` (migrations + initialRoute selection).
- DB schema: `db/schema.ts` and `db/index.ts`.
- Migrations folder: `drizzle/` (contains SQL assets and `migrations.js`).
- Babel / Metro: `babel.config.js`, `metro.config.js`.

If something is broken
- Verify you used the npm script (start/android/ios) rather than calling `expo` directly — scripts set `NODE_OPTIONS=--dns-result-order=ipv4first` which the app expects.
- If migrations fail, inspect `drizzle/migrations.js` and `db/schema.ts` and ensure `.sql` assets are present.
