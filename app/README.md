# Nest Finance app

Android app for Nest Finance (Expo, React Native, `@solana/kit`, Mobile Wallet Adapter). See the [root README](../README.md) for the product, the program and how to run it.

```bash
npm install
npx expo run:android
```

Native pieces beyond Expo's defaults:

- `modules/nest-sms`: a local Kotlin module that sends the backup-PIN text without opening an SMS app.
- `@noble/ciphers` and `@noble/hashes`: decrypt the Groq key at run time (AES-256-GCM, key from SHA-256). Put `GROQ_API_KEY=` in `.env.local` (git-ignored) and run `npm run groq:key` before building; without it, Nest Intelligence shows its computed facts only.
- `expo-build-properties` limits the APK to `arm64-v8a` and `x86_64` (real phones and the emulator).
