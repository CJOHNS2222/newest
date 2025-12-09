Icon generation and applying to native projects

This project includes two source icons in `public/icons/`:
- `icon512.png` (recommended master source)
- `icon192.png`

The `package.json` contains a helper script that uses `pwa-asset-generator` to create the PWA icons plus iOS/Android icon sets under `resources/`.

1) Generate assets (runs via `npx`, no global install required):

```powershell
# From repo root
npm run generate:icons
```

This runs:
`npx pwa-asset-generator public/icons/icon512.png resources --manifest ./public/manifest.webmanifest --favicon --index --android --ios`

After running, the `resources/` folder will contain generated icons for web, iOS and Android as separate files.

2) Apply icons to Capacitor Android app

Manual approach (recommended):
- Open `resources/` and locate the Android icon files (or folders) created by the tool.
- Copy the appropriate sizes into the Android project under `android/app/src/main/res/` with the correct resource folder names (e.g., `mipmap-hdpi`, `mipmap-xhdpi`, etc.).

Automatic (one-off) using Android Studio:
- Open `android/` in Android Studio
- Right-click `app/src/main/res` -> New -> Image Asset
- Point to the generated `resources/android` source image as the foreground image and generate adaptive and legacy icons.

3) Apply icons to iOS

- For iOS, open `ios/App/App/Assets.xcassets/AppIcon.appiconset` in Xcode and replace the images with those generated under `resources/ios`.

4) Alternative: use `cordova-res` (if you prefer)

`cordova-res` can generate and automatically copy icons into native projects. Install and use it like:

```powershell
npm i -g cordova-res
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
```

Notes
- `pwa-asset-generator` focuses on PWA and app icons, and can produce images for iOS and Android. It is very customizable with flags; run `npx pwa-asset-generator --help` for details.
- After applying icons to the native projects, run:

```powershell
npx cap sync android
# and/or
npx cap sync ios
```

so Capacitor picks up the new assets.

If you want, I can run `npm run generate:icons` here (it will download the generator and create resources) — tell me if you want me to run it and I will generate the assets and show you the results in `resources/` so you can pick which to copy into Android/iOS projects.
