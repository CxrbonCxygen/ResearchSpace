# ResearchSpace Android

Offline Android 8.0+ package for the existing ResearchSpace workspace. The complete interface, math renderer and fonts are bundled in the APK. The app saves edits to IndexedDB in its private app storage before attempting cloud synchronization. Its session token is encrypted with Android Keystore; passwords are not stored on the phone. Cloud access uses the independent account configured by the original workspace owner.

Build the shared frontend in `../web` using `node node_modules/vite/bin/vite.js build --config mobile/vite.config.ts`, then run `./build.ps1`. The script uses the isolated tools in `../android-build-tools`. Release signing keys and their Windows DPAPI protected password remain in `.local-signing/`; retain this folder for compatible future updates. Never upload this folder or put it in the APK.

When the app is open, it syncs on connection recovery, app resume, manual sync, and a 30-second interval. Offline changes remain pending across restarts. Conflicting changes retain both local and remote copies and require a choice in the app. Android background sync while the app is closed is not implemented in this version.

The native package only requests Internet permission. Export/import uses Android's file picker. Other apps cannot read its private storage. Uninstalling the APK clears local app data, so synchronize or export pending records first.


## Version 1.0.2

The training dashboard now opens inside the app. Open an experiment while online to cache its curves and evaluations; the same dashboard then remains readable offline and marks the saved time. New data refreshes when online. Metric CSV files use Android's save dialog. The native network bridge accepts authenticated training GET requests only; token creation and revocation remain available in the website.

Version code 3 uses the same package name and signing certificate as 1.0.1. Install over the existing app to retain local records; do not uninstall first.

For your own build, place the Android SDK platform/build-tools and JDK in `../android-build-tools`, or adapt the two build scripts to their installed locations. This project uses JDK 17, Android platform 35 and build-tools 35. Generate and retain your own release signing key; the original owner's signing key is deliberately excluded from source control.


## Version 1.0.3

Keeps horizontal experiment-table scrolling inside the table after switching datasets or tabs. Screen-reader column labels remain contained in the table. Package name and release signing certificate remain unchanged; install over 1.0.2 to retain local records.
