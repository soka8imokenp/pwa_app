# Daily Sumire — native app (Kotlin Multiplatform)

Native rewrite of the Daily Sumire planner & health companion with **Compose Multiplatform**.
Android is the primary target; the shared code also compiles for iOS (UI shell + platform services still to do).

## Modules & layout

```
mobile/
  composeApp/
    src/commonMain/kotlin/com/kairo/planner/
      core/        time (local calendar), formatting, ids
      model/       domain models
      data/        SQLDelight repositories, settings, backup import/export, Health Connect sync
      domain/      health formulas, BIA body composition, weight trend, streaks, focus timer, app lock
      scale/       BLE smart-scale drivers + ScaleManager (Kable)
      ai/          Gemini client, context builder, Sumire assistant (tool-calling agent)
      sync/        REST client + two-way cloud sync (server /api/sync/v2)
      ui/          design system, splash, screens, sheets
      i18n/        ru / uz / en strings (switchable at runtime)
    src/commonMain/sqldelight/   database schema
    src/androidMain/             Activity, Health Connect, step sensor, notifications, permissions
    src/iosMain/                 iOS entry point (stubs for platform services)
```

## Build

CI builds everything on every push to `kotlin-kmp` (`.github/workflows/mobile.yml`) and publishes the
APKs to the **kmp-preview** pre-release. Locally (JDK 17 + Android SDK):

```bash
cd mobile
./gradlew :composeApp:testDebugUnitTest :composeApp:assembleDebug
```

Release signing: set `SUMIRE_KEYSTORE_PATH`, `SUMIRE_KEYSTORE_PASSWORD`, `SUMIRE_KEY_ALIAS`,
`SUMIRE_KEY_PASSWORD` (in CI: secrets `SUMIRE_KEYSTORE_BASE64` + the three passwords).

## Smart scales

| Scale | How |
|---|---|
| Xiaomi Mi Body Composition Scale 2 (XMTZC02HM/05HM), Mi Body Fat Scale | BLE broadcast, weight + impedance → full composition |
| Xiaomi Mi Smart Scale 1/2 (XMTZC01HM/04HM) | BLE broadcast, weight |
| Any scale with Bluetooth SIG Weight Scale / Body Composition service (Beurer, Sanitas, Medisana, Silvercrest, A&D, Omron …) | BLE GATT |
| Everything else (Renpho, Eufy, Withings, Huawei, Garmin, Zepp/Mi Fitness, Samsung …) | via **Health Connect** import |

Adding a brand = one class implementing `BroadcastScaleDriver` or `GattScaleDriver` in
`scale/ScaleDrivers.kt` + a decoding unit test.

## Steps

Health Connect (aggregated, de-duplicated across watch + phone) and the phone's hardware step counter,
sampled every 15 minutes by WorkManager. "Auto" uses the larger value per day.

## Data migration from the web/PWA app

Old app: *Settings → Export* → JSON file. New app: *More → Settings → Import data*. Numeric ids are
converted to UUIDs, habit logs keep their links, weights get body composition recomputed.
