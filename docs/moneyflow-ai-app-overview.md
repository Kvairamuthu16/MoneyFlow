# MoneyFlow AI — App Overview & Feature Documentation

*Prepared as a reference document for external AI assistants (ChatGPT, etc.) to understand this project's purpose, architecture, and current feature set.*

---

## 1. What This App Is

**MoneyFlow AI** is a personal finance / expense-tracking Android app for the Indian market. Its core mechanism: Indian banks send a free SMS for nearly every transaction (debit, credit, UPI, ATM, etc.) — this app reads those SMS on-device, automatically parses them into structured transactions, categorizes them, and presents dashboards/budgets/analytics, **without any backend server, user account, login, or cloud sync of any kind.**

### Core value proposition
- **100% offline, zero backend.** No server exists anywhere in the architecture. All data — transactions, budgets, settings — is stored locally on the device in encrypted key-value storage (MMKV, encrypted with a per-install random key from the Android Keystore/Keychain).
- **No account creation, no login, no phone number/email collection.**
- Positioned against Indian competitors (Axio/Walnut, MoneyView, ET Money) whose SMS-reading apps are fundamentally lending/credit lead-generation businesses that upload transaction data to their own servers. This app has no such business model and nothing to leak, sell, or be subpoenaed, because there is no server.

### Platform reality (important constraint)
- **Android only.** The entire product depends on reading the SMS inbox, and iOS provides no API for any third-party app to access SMS/Messages data — this is an OS-level sandboxing restriction, not a permissions issue, and cannot be worked around. An iOS version would require a completely different data-entry mechanism (manual entry, CSV import) since there is no SMS signal to read there.
- The core "free per-transaction SMS" banking pattern is common in India, Pakistan, Bangladesh, Nigeria (regulatory-mandated there), and parts of Southeast Asia/the Gulf — it is **not** the default in the US/UK/EU, where bank alerts are opt-in/threshold-based, not universal.

---

## 2. Tech Stack

- **React Native 0.74.2**, bare CLI (no Expo), old architecture (Paper, not Fabric/TurboModules)
- **TypeScript** throughout
- **React Navigation v6** — bottom tabs (`@react-navigation/bottom-tabs`) with a nested stack (`@react-navigation/stack`) inside the Transactions tab
- **react-native-mmkv** — encrypted local key-value storage (the entire "database")
- **react-native-keychain** — Android Keystore-backed secure storage for the MMKV encryption key and the app-lock PIN hash
- **react-native-biometrics** — fingerprint/face unlock
- **react-native-get-sms-android** — reads the SMS inbox (manual scan path)
- **@notifee/react-native** — local notifications (budget alerts, salary credits, bill reminders)
- **react-native-contacts** — optional, on-device-only contact-name resolution
- **victory-native** (Skia-based) — charts (pie, line/trend)
- **@shopify/flash-list** — high-performance lists
- **react-native-reanimated** + **react-native-linear-gradient** — animations/gradients
- **Jest + @testing-library/react-native** — test suite (17 suites, 123 tests, all passing)
- **GitHub Actions (Ubuntu runner)** — the reliable native Android build path; local Windows builds hit a MAX_PATH (260 char) limitation in native dependency builds

All native dependencies are deliberately version-pinned to releases contemporaneous with RN 0.74.2 (mid-2024), since newer versions require newer RN core APIs than 0.74.2 exposes.

---

## 3. Architecture

Clean, feature-based modular architecture. No business logic lives in UI components — everything routes through dedicated service modules.

```
src/
  components/        Reusable UI primitives (Card, Button, Chip, KpiCard, ProgressBar, MonthSelector)
  context/            AppDataContext (global state: transactions/budgets/settings), ThemeContext
  features/
    dashboard/        Dashboard screen
    transactions/      List, Detail screens + nested stack navigator
    budgets/           Budgets screen
    analytics/          Charts/insights screen
    settings/           Preferences screen
    lock/               Biometric/PIN lock gate + LockScreen
  services/
    sms/               The entire SMS transaction-processing pipeline (see §4)
    notifications/     Local notification services
    accountLabel.ts    Multi-account identity/grouping logic
    biometrics.ts
  storage/
    mmkv.ts            AppStorage — all persistence reads/writes
    secureKey.ts        Per-install encryption key generation/retrieval
    pinAuth.ts          PIN hashing/verification
  utils/               Pure helper functions (currency formatting, date math, budget computation, account summaries)
  types/               Shared TypeScript interfaces (Transaction, Budget, AppSettings, etc.)
```

Android native additions (for the real-time SMS listener):
```
android/app/src/main/java/com/moneyflowai/
  SmsReceiver.kt              BroadcastReceiver for SMS_RECEIVED
  SmsHeadlessTaskService.kt   Boots a headless JS task to process one incoming SMS
```

---

## 4. The SMS Transaction Engine (core feature)

A modular pipeline, each stage independently unit-tested:

```
SmsFilterService → SmsParserService → MerchantNormalizationService
  → CategoryEngine (+ LearningService) → ContactResolverService (+ PartyLabelService)
  → DuplicateDetectionService → TransactionImportService
```

Two callers feed this same pipeline:
- **SmsSyncWorker** — manual "Scan SMS" / pull-to-refresh, with a day/week/month/all-time range picker and an incremental sync cursor (so routine refreshes don't re-read the whole inbox).
- **backgroundSmsTask** — the real-time path (see §4.9).

### 4.1 SmsPermissionService
Requests `READ_SMS` (manual scan) and `RECEIVE_SMS` (real-time listener) separately, each with its own plain-language rationale shown before the OS dialog. A RECEIVE_SMS denial just disables real-time detection; manual scan still works with READ_SMS alone.

### 4.2 SmsReaderService
Thin wrapper over the native SMS content-provider bridge (`react-native-get-sms-android`) — the only file that touches it directly.

### 4.3 SmsFilterService (pre-parse gate)
Before any regex extraction runs, filters out:
- **Hard-deny keywords**: OTP, verification codes, login/password alerts, KYC reminders, offers, cashback promos, coupons, discounts, loan/credit-card offers, delivery/courier/tracking notices, bookings, promotions, subscriptions (marketing sense), reward points, advertisements, spam.
- **Sender-type rejection**: any sender that looks like a plain 7–15 digit mobile number is rejected outright — banks/DLT gateways always use short alphanumeric sender IDs (e.g. `AD-HDFCBK`), never a personal phone number, so this filters out person-to-person chat messages that happen to mention money.
- **Promotional-company senders** (Amazon, Flipkart, Myntra, Swiggy, Zomato) are rejected **unless** the message also contains real payment evidence (an amount + a transaction verb).

### 4.4 SmsParserService (regex extraction engine)
Pure regex/pattern-based extraction (no ML, no network call — this app is 100% offline by design, so "AI fallback" is a deterministic heuristic tier, not a hosted model). Extracts:

- **Amount, currency** (INR/USD/EUR/GBP detection from symbol)
- **Transaction type** (income/expense) from keyword signals
- **Transaction status**: `success | failed | reversed | pending`
- **Payment method**: UPI, ATM, Cash Withdrawal/Deposit, Bank Transfer, NEFT, RTGS, IMPS, Credit/Debit Card, Tap & Pay, Wallet, Cash, Standing Instruction, Auto Debit, Cheque, FASTag, Other
- **Bank name** — matched against a config-driven bank/keyword list (see §4.4a); falls back to matching the **SMS sender address** when the message body itself never names the bank (a common real-world gap fixed recently — many templates only say "A/c XX1234 debited," relying on the sender ID like `VM-HDFCBK` to identify the bank)
- **Account last digits vs. card last digits** — kept as two distinct fields (a message can reference both a bank account and a card)
- **UTR number** — distinct from a generic reference/UPI transaction ID
- **UPI IDs**: generic `upiId`, plus direction-aware `payerUpiId` (income) / `payeeUpiId` (expense)
- **Mobile number** (extracted from the UPI ID's local part or free text) and **email address**
- **Merchant name** — structured regex patterns first ("paid to X", "spent at X", "From BANK ... To X" multi-line layouts), then a small known-merchant hint list, then a last-resort Title-Case proper-noun heuristic (flagged internally as lower-confidence)
- **Reference number, balance-after-transaction**
- **Confidence score** (0–1) — rewards structured merchant matches, presence of a reference/UTR, and a parsed balance; penalizes reliance on the loose fallback merchant heuristic

**4.4a — Extending to new banks**: bank names/keywords live in `src/services/sms/config/bankSenderPatterns.json`, a plain data file. Adding a new bank is a JSON edit, not a code change.

### 4.5 MerchantNormalizationService
Collapses raw spelling variants into one canonical merchant name (e.g. `AMZN` / `AMAZON PAY` / `amazon seller` → `Amazon`), via a substring-alias dictionary covering Amazon, Flipkart, Swiggy, Zomato, Uber, Ola, Blinkit, DMart, Netflix, PhonePe, Google Pay, Paytm, CRED, Jio, Airtel, and more.

### 4.6 CategoryEngine + LearningService
Rule-based categorization across a broad taxonomy: Food, Groceries, Medical, Fuel, Transport, Travel, Shopping, Entertainment, Recharge, Internet, Utilities, Insurance, Rent, EMI, Loan, Subscription, Gifts, Taxes, Salary, Income, Investment, Education, Cash, Cashback, Refund, Transfer, Other.

**Learning loop**: whenever a user manually recategorizes a transaction (via the Transaction Detail screen's category picker), `LearningService` remembers that merchant → category mapping in local storage. On every future categorization call, a learned override always wins over the default keyword rules — the exact "teach it once" pattern requested in the original spec ("Amazon: Shopping → Office Expense" sticks for all future Amazon transactions).

### 4.7 ContactResolverService + PartyLabelService
- **ContactResolverService**: if a mobile number or email was extracted, optionally (opt-in, off by default) matches it against the device's own contacts via `react-native-contacts`, entirely on-device — nothing is ever transmitted. Shows "Paid To: John Kumar" instead of a raw UPI ID/number.
- **PartyLabelService**: independent of device contacts — lets the user set their own custom label for a counterparty (e.g. rename a UPI ID to "Landlord") without writing anything back to their actual address book.

### 4.8 DuplicateDetectionService
Two layers, beyond the cheap exact-message-ID cache in TransactionImportService:
1. **Compound-field comparison** (amount, reference number, date, time, and account identity) for the case where the same real-world transaction arrives as two distinct SMS (e.g. the bank's own message plus a UPI app's confirmation).
2. **Raw-text hash comparison** for the exact same SMS being delivered twice under different message IDs (dual-SIM duplicate delivery, a bank resending).

**Account-identity matching** (`isSameAccount` in `accountLabel.ts`) is deliberately *not* a naive string match: banks mask a different number of trailing digits across templates (`••9892` vs `••892`), so a shorter mask that's an exact suffix of a longer one is treated as the same account — but two *same-length* masks that merely share trailing digits (`••1234` vs `••5234`) are correctly treated as different accounts, avoiding both false-negative duplicate misses and false-positive account merges.

### 4.9 Real-time background listener
A native Android `BroadcastReceiver` (`SmsReceiver.kt`) fires on every incoming SMS — even if the app isn't running — and hands off to `SmsHeadlessTaskService.kt`, which boots a short-lived JS engine to run the `backgroundSmsTask.ts` headless task. That task runs the exact same `TransactionImportService` pipeline as the manual scan, for the single new message, and emits a `MoneyFlowTransactionsUpdated` event so a foregrounded app refreshes live instead of waiting for the next manual sync. Requires `RECEIVE_SMS`; falls back gracefully to manual-scan-only if denied.

### 4.10 Privacy control
Raw SMS body text (`sourceText`) is **not** persisted by default — only structured fields (amount, category, merchant, bank, date, etc.) are stored. A Settings toggle lets the user opt in to keeping the raw text (shown on the Transaction Detail screen if enabled).

---

## 5. Multi-Bank / Multi-Account Support

Every transaction carries `bank` + `accountLast4` (and separately `cardLast4`). The app segregates data per real-world account, not just globally:

- **Dashboard "Accounts" section** — one card per detected account (only shown once there are 2+), each showing transaction count, this-month income/expense, and the most recent known balance; tapping a card navigates into Transactions pre-filtered to that account.
- **Transactions screen** — account filter chips, derived the same way.
- **Analytics** — a "Spend By Bank/Account" breakdown, parallel to the category breakdown.
- Account identity/grouping and duplicate detection both use the same digit-length-aware matching logic described in §4.8, so the same account isn't fragmented by inconsistent SMS masking, and different accounts are never incorrectly merged.

---

## 6. Security

- **Per-install random 256-bit encryption key**, generated on first launch via `react-native-get-random-values`, stored in the Android Keystore (`react-native-keychain`) — replaced a previous hardcoded-in-source key that offered no real protection.
- **Biometric/PIN app lock**: PIN is the required base mechanism (hashed with `js-sha256`, never stored in plaintext), with biometric unlock offered as a convenience layer on top (not the sole mechanism, since not all devices have biometric hardware). Gates the entire app before any data loads (`AppGate` component wraps the whole app tree, awaiting storage initialization and, if enabled, a successful unlock before rendering anything else).
- `android:allowBackup="false"` in the manifest (no Android auto-backup of the encrypted store to Google's cloud).

---

## 7. Notifications (local only, no push infrastructure)

- **Budget threshold alerts** — fires once per (category, month, 80%/100% threshold), deduped so it doesn't re-notify on every subsequent transaction.
- **Salary-credited notifications** — fires for newly-imported income transactions categorized as Salary.
- **Bill/recurring-payment reminders** — lightweight heuristic: groups expense transactions by (category, merchant) among bill-like categories (Rent, EMI, Loan, Insurance, Utilities, Recharge, Internet, Subscription), and if at least two occurrences cluster ~25–35 days apart, predicts the next due date and schedules a reminder a few days ahead. No separate "subscriptions" data model yet — this reuses existing transaction history.

All notifications are opt-in via a single Settings toggle that requests the OS notification permission.

---

## 8. Screens

- **Dashboard** — hero "Durable Cash Balance" card (net cash flow for the selected month), KPI grid (income/expense/savings rate/daily burn), quick actions (Scan SMS with a day/week/month/all-time range picker, Add Budget, Reports), Accounts section (§5), Smart Offline Insights (rule-based alerts: overspend, over-budget categories), Recent Activity list.
- **Transactions** — searchable/filterable list (type, category, account, sort order), grouped by date; tapping a row opens:
  - **Transaction Detail** — status badge, amount, a chip-grid category picker (feeds the learning loop), counterparty section with a rename field (feeds PartyLabelService), bank/account/card/payment-method fields, reference/UTR/balance, a confidence-score meter with a low-confidence callout, and the source SMS text (only if the privacy toggle is on). Swipe-to-delete remains on the list.
- **Budgets** — user-defined category budgets with spend-vs-limit progress bars; a starter seed set is created on first launch.
- **Analytics** — dominant-category card, category-share pie chart, 6-month spend trend line chart, category breakdown bars, bank/account breakdown bars, top-merchant list, and a short list of rule-based recommendations (e.g. "spending up 18% vs last month," "no budget set for your top category").
- **Settings** — theme (light/dark/system), currency (INR/USD/EUR/GBP), biometric lock setup, contact-resolution opt-in, real-time SMS detection opt-in, notifications opt-in, raw-SMS-storage opt-in, JSON backup export/restore (via native Share sheet), factory reset.

---

## 9. Data Model (core types)

```ts
type TransactionType = 'income' | 'expense';
type TransactionStatus = 'success' | 'failed' | 'reversed' | 'pending';
type PaymentMethod = 'UPI' | 'ATM' | 'Cash Withdrawal' | 'Cash Deposit' | 'Bank Transfer'
  | 'NEFT' | 'RTGS' | 'IMPS' | 'Credit Card' | 'Debit Card' | 'Tap & Pay' | 'Wallet'
  | 'Cash' | 'Standing Instruction' | 'Auto Debit' | 'Cheque' | 'FASTag' | 'Other';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string;
  receiverName?: string;
  senderName?: string;
  contactName?: string;       // resolved device-contact name or custom label
  upiId?: string;
  payerUpiId?: string;
  payeeUpiId?: string;
  mobileNumber?: string;
  emailAddress?: string;
  bank: string;
  accountLast4?: string;
  cardLast4?: string;
  utrNumber?: string;
  date: string;                // YYYY-MM-DD
  time?: string;               // HH:MM
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  category: string;
  balanceAfter?: number;
  referenceNumber?: string;
  confidenceScore: number;     // 0.0–1.0
  sourceSMSId?: string;
  sourceText?: string;         // only present if the privacy toggle is enabled
}

interface Budget { category: string; limit: number; spent: number; }

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  smsPermissionGranted: boolean;
  selectedMonth: string;                       // YYYY-MM
  biometricLockEnabled: boolean;
  contactsPermissionGranted: boolean;
  realtimeSmsDetectionEnabled: boolean;
  storeRawSmsBody: boolean;                    // off by default
  notificationsEnabled: boolean;
}
```

Storage is entirely local (MMKV key-value store) — there is no SQL database and no server-side schema.

---

## 10. Testing & Quality

- **123 tests across 17 Jest suites**, covering every SMS-pipeline stage independently (filter, parser across multiple real bank/UPI-provider SMS formats, merchant normalization, category engine + learning, duplicate detection, contact resolution, background task) plus notification services and UI-adjacent utilities (account summaries, currency formatting).
- TypeScript strict compilation (`tsc --noEmit`) and a Metro release-bundle build are run as standard verification steps for every change.
- GitHub Actions (Ubuntu runner) is the reliable path for verifying native Android/Kotlin changes, since local Windows builds hit a MAX_PATH limitation in some native dependency builds.

---

## 11. Known Limitations / Not Yet Built

- **No iOS support**, and none is possible for the core SMS feature (platform restriction, not an engineering gap). An iOS release would need a manual-entry/CSV-import mode as a parallel data source.
- **No manual "add transaction" screen** — today, every transaction originates from SMS import only.
- **No SQLite** — MMKV key-value storage works today but a real database migration (behind a repository seam) would be needed before transaction volume gets large enough to make full-array rewrites on every write visibly slow.
- **No CSV/PDF export**, only JSON backup/restore.
- **No dedicated subscription-tracking model/UI** (only the lightweight bill-reminder heuristic described in §7), no goal tracking, no net worth / investment / loan-specific tracking modules.
- **No UI localization** (English only) — a real gap against a linguistically diverse Indian user base.
- Sender/keyword configuration currently ships inside the app bundle (no remote/OTA config), consistent with the fully offline architecture.

---

## 12. Competitive Positioning (market context)

Researched Indian-market competitors: **Axio (formerly Walnut)**, **MoneyView**, **ET Money**, **FinArt**, **mMoney/mTrakr/Vrid** (smaller indie apps). Nearly all automatic SMS-parsing apps in this space are lending/credit businesses at their core — they read your SMS specifically to build a credit profile and upsell BNPL/personal loans, and they upload your transaction data to their own servers to do so. The one privacy-first alternative found (TrackMyRupee) achieves that by *not* reading SMS at all (manual entry only), trading away automation for privacy.

This app's differentiation: automatic SMS-based tracking **and** a genuinely zero-backend architecture — a combination not found among the researched competitors. India's Digital Personal Data Protection Act (DPDP) is now in active enforcement (Q1 2026 Data Protection Board actions already targeting fintech apps for exactly this over-collection/data-sharing pattern), which sharpens this as a real, current differentiator rather than only a marketing claim.
