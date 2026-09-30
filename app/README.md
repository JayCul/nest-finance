# Nest Finance app

Android app for Nest Finance (Expo, React Native, `@solana/kit`, Mobile Wallet Adapter). See the [root README](../README.md) for the product, the program and how to run it.

```bash
npm install
npx expo run:android
```

Native pieces beyond Expo's defaults:

- `modules/nest-sms`: a local Kotlin module that sends the backup-PIN text without opening an SMS app.
- `llama.rn`: llama.cpp for the on-device AI explanation (`features/ai/on-device.ts`). Its install script downloads prebuilt native libraries; on Windows run `npm install` with `C:\Windows\System32` first on the PATH so it uses Windows' `tar`.
- `expo-build-properties` limits the APK to `arm64-v8a` and `x86_64` (real phones and the emulator).

The AI model itself is not bundled: the app downloads it (about 400 MB) the first time someone asks for an explanation.
