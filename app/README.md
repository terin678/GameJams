# Beanstalk, the phone app

This folder wraps the game for Android with Capacitor 8. Nothing here is used
by the website. The checklist for getting to the Play Store is in
`games/beanstalk/ROADMAP.md` (step 5).

- `capacitor.config.json`: the app id (`com.veracity.beanstalk`; it can never
  change after the first release) and name.
- `android/`: the Android project, made by Capacitor and then edited (locked
  to portrait; a newer Gradle, see below). Open this folder in Android Studio.
- `www/`: the app's copy of the game. Built, not committed.

## After any change to the game

```bash
cd app
npm install
npm run sync
```

`sync` rebuilds `www` (one minified script, no source map, plus the page, icons
and privacy page) and copies it into the Android project.

## Run it

Open `app/android` in Android Studio and press Run, with a phone plugged in or
an emulator chosen. Or, from a terminal:

```bash
cd app/android
./gradlew assembleDebug
```

The app file is then `app/android/app/build/outputs/apk/debug/app-debug.apk`.
From a terminal Gradle needs to be told where Java is: set `JAVA_HOME` to
Android Studio's own copy (`C:\Program Files\Android\Android Studio\jbr`).

## Two things that are not Capacitor's defaults

- **Node 22 for the Capacitor tool.** Capacitor 8's command line needs Node 22
  or newer; this machine has Node 20. The `cap` script in `package.json` runs
  it under Node 22 through `npx`, without changing the installed Node.
- **Gradle 9.1.** Android Studio now ships Java 25, which the Gradle version
  Capacitor picks (8.14) cannot run on.
  `android/gradle/wrapper/gradle-wrapper.properties` is set to 9.1.0. If the
  Android project is ever made again from scratch, make that change again.
