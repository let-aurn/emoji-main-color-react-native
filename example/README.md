This example now follows the same runnable structure as `react-native-system-emoji-picker`: full React Native app scaffold, `ios` and `android` projects, Metro config for the linked local package, and npm scripts for local development.

# Getting Started

## Install dependencies

```bash
npm install
bundle install
cd ios && bundle exec pod install && cd ..
```

If you see `can't find gem cocoapods ... executable pod`, run `bundle install` in `example` and retry `bundle exec pod install`.

## Run Metro

```bash
npm start
```

## Run Android

```bash
npm run android
```

## Run iOS

```bash
npm run ios
```

This demo exercises:

- `useEmojiColor`
- `getEmojiColors`
- memory and disk cache modes
- palette rendering for the selected emoji
