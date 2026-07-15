# Extending the SMS engine

The SMS transaction pipeline lives in `src/services/sms/`. It runs, in order:

```
SmsFilterService -> SmsParserService -> MerchantNormalizationService
  -> CategoryEngine (+ LearningService) -> ContactResolverService (+ PartyLabelService)
  -> DuplicateDetectionService -> TransactionImportService -> SmsSyncWorker
```

Each stage is a standalone module with its own unit tests under `__tests__/sms/`.
`TransactionImportService` is the only place that wires them together; nothing
else in the app imports the individual stages directly except via the
`src/services/sms` barrel.

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

- **Real-time background listening.** The pipeline above runs on manual
  scan / pull-to-refresh today. A live `SMS_RECEIVED` broadcast receiver is a
  native Android module (Java/Kotlin + a `RECEIVE_SMS` manifest entry) that
  hasn't been built yet -- it's a separate, CI-verified piece of work, not a
  JS/TS change.
- **A hosted/cloud AI fallback parser.** When structured regex patterns and
  known-merchant hints don't recognize a message, `SmsParserService` falls
  back to a deterministic heuristic (a Title Case proper-noun scan), not a
  network call to an LLM -- this app has no backend and no bundled ML
  runtime by design.
- **Contact photos, "favorite contact" flags, and remote/OTA-updatable
  config.** All contact resolution here is display-name-only, and every
  config file ships inside the app bundle (there's no server to fetch an
  updated list from without breaking the offline-only architecture).
