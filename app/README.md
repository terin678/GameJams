# Beanstalk, the phone app

This folder wraps the game for Android with Capacitor. Nothing here is used by
the website. The checklist for getting to the Play Store is in
`games/beanstalk/ROADMAP.md` (step 5).

What is here so far: the settings (`capacitor.config.json`), the packages
needed (`package.json`), and a build that makes the app's copy of the game.
The Android project itself is not made yet; that needs Android Studio.

## Before the first build: choose the app id

`capacitor.config.json` says `com.example.beanstalk`. Change it to an id you
own (for example `com.yourname.beanstalk`) before making the Android project.
Once an app is released under an id, the id can never change.

## Build the app's copy of the game

From the repository root:

```bash
npm install
npm run build:app
```

That writes `app/www`: the page, one minified script with no source map, the
icons and the privacy page. It is not committed.

## Make and run the Android project (needs Android Studio)

```bash
cd app
npm install
npx cap add android
npm run sync
npm run open
```

Run `npm run sync` again after any change to the game.
