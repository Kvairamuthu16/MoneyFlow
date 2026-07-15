# Extending the SMS engine

The SMS transaction pipeline lives in `src/services/sms/`. It runs, in order:

```
SmsFilterService -> SmsParserService -> MerchantNormalizationService
  -> CategoryEngine (+ LearningService) -> ContactResolverService (+ PartyLabelService)
  -> DuplicateDetectionService -> TransactionImportService
```

Each stage is a standalone module with its own unit tests under `__tests__/sms/`.
`TransactionImportService` is the only place that wires them together; nothing
else in the app imports the individual stages directly except via the
`src/services/sms` barrel.

Two different callers feed messages into that same pipeline:

- **`SmsSyncWorker`** -- manual scan / pull-to-refresh. Reads a batch from the
  inbox (`SmsReaderService`), runs the whole batch through
  `TransactionImportService`, persists via `ImportPersistence`.
- **`backgroundSmsTask`** -- the real-time path (see below). Runs a *single*
  message through the exact same `TransactionImportService` and
  `ImportPersistence`, so there is only one place the actual
  filter/parse/categorize logic lives.

## Real-time background detection

`android/app/src/main/java/com/moneyflowai/SmsReceiver.kt` is a manifest-declared
`BroadcastReceiver` for `SMS_RECEIVED` -- Android starts it (even if the app
isn't running) whenever an SMS arrives. It hands the sender/body/timestamp to
`SmsHeadlessTaskService.kt`, which boots a short-lived JS engine to run the
`"SmsBackgroundImport"` headless task registered in `index.js`
(`src/services/sms/backgroundSmsTask.ts`). That task calls
`TransactionImportService` with the one new message and persists the result
the same way `SmsSyncWorker` does. If the app happens to be open at the time,
`backgroundSmsTask` also emits a `MoneyFlowTransactionsUpdated` event
(`DeviceEventEmitter`) that `AppDataProvider` listens for, so the UI updates
live instead of waiting for the next manual refresh.

Requires the `RECEIVE_SMS` permission (requested alongside `READ_SMS` in
`SmsPermissionService`, with its own rationale) and a Settings toggle
("Real-Time SMS Detection") that reflects whether it's currently granted. A
denial just means the app falls back to manual scan/refresh -- `READ_SMS`
alone is sufficient for that.

**Verification limits, stated plainly:** the JS side (`backgroundSmsTask.ts`)
has real unit tests (`__tests__/sms/backgroundSmsTask.test.ts`) and the Kotlin
compiles as part of the normal Android build. What *cannot* be verified from
this dev environment is the actual end-to-end behavior on a device -- does a
real incoming SMS actually wake the receiver, does the headless task run to
completion before Android reclaims the process, does it behave correctly
across different OEM battery-optimization/Doze-mode restrictions. That needs
an installed APK and a real test SMS on a physical device.

This app is 100% offline with no backend, so "configurable without code
changes" means: **the data lives in JSON files, separate from the business
logic that reads them.** Adding a bank or tuning a filter keyword is a data
edit to a config file, not a change to any `.ts` logic file -- but it still
ships in the next build, since there is no remote config server to push to.

## Adding a new bank or payment provider

Edit `src/services/sms/config/bankSenderPatterns.json`:

```json
{ "name": "YOUR BANK", "keywords": ["your bank", "yourbank"] }
```

`keywords` are lowercase substrings matched against the SMS body. The first
entry whose keyword appears in the message wins, so put more specific names
before generic ones if they could collide. `SmsParserService.detectBank()`
loads this file directly -- no code change needed.

## Adding a new UPI handle

Nothing to configure. `SmsParserService`'s UPI regex
(`/\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/`) matches any `<name>@<handle>`
shape, so new handles (`@newbank`, `@newapp`) are picked up automatically as
they appear -- there is no hardcoded provider list to update.

## Tuning what counts as spam vs. a real transaction

Edit `src/services/sms/config/financialKeywordFilters.json`:

- `hardDenyKeywords` -- if any of these appear anywhere in the message, it's
  rejected unconditionally (OTPs, delivery notices, pure marketing copy).
  Only add a word here if it could never legitimately appear in a real
  transaction message.
- `softDenyKeywords` -- rejected **only if** the message also lacks a real
  amount + transaction verb (see `hasStrongTransactionSignal` in
  `SmsFilterService`). This is where words that are *both* marketing terms
  and real transaction types live -- e.g. "cashback" is used in promo copy
  ("get 10% cashback!") and in genuine credit messages ("Rs.20 cashback
  credited"). Put ambiguous words here, never in `hardDenyKeywords`.
- `transactionVerbs` -- words that, combined with a detected amount, count as
  "this message describes a completed transaction." Add a verb here if a new
  bank phrases debits/credits in a way the existing list doesn't cover.
- `promotionalSenderCompanies` -- companies whose *own* sender IDs are
  suppressed unless the message has real payment evidence (their marketing
  volume vastly outweighs their transactional SMS volume).

## Adding a new category

Add the category name to `ALL_CATEGORIES` in `CategoryEngine.ts` and a `Rule`
entry in the `RULES` array with its trigger keywords. Rule order matters --
the first matching rule wins, so put specific/reliable keywords (a named
merchant) before generic ones (a payment-method word like "upi").

`ALL_CATEGORIES` is the single source of truth budgets and the Transactions
screen's recategorize control read from -- adding a category here is enough
to make it selectable everywhere in the app.

## What stays out of scope here

- **A hosted/cloud AI fallback parser.** When structured regex patterns and
  known-merchant hints don't recognize a message, `SmsParserService` falls
  back to a deterministic heuristic (a Title Case proper-noun scan), not a
  network call to an LLM -- this app has no backend and no bundled ML
  runtime by design.
- **Contact photos, "favorite contact" flags, and remote/OTA-updatable
  config.** All contact resolution here is display-name-only, and every
  config file ships inside the app bundle (there's no server to fetch an
  updated list from without breaking the offline-only architecture).
