# Local notifications

`src/services/notifications/` (Notifee-backed, entirely on-device -- no push
service, no backend). Three notification types, one orchestrator:

- **`SalaryNotificationService`** -- fires immediately for any newly-imported
  transaction with `type: 'income'` and `category: 'Salary'`.
- **`BudgetAlertService`** -- recomputes each budget's spend for the *actual*
  current calendar month (`getCurrentYearMonth()`, not `settings.selectedMonth`
  -- that's just whatever month the user happens to be browsing) and fires
  once the first time a category crosses 80% or 100%. A (category, month,
  threshold) key is persisted in MMKV so it never re-fires for the same
  crossing.
- **`BillReminderService`** -- groups expense transactions by (category,
  merchant) among bill-like categories (Rent, EMI, Loan, Insurance, Utilities,
  Recharge, Internet, Subscription). If at least two occurrences cluster
  25-35 days apart, predicts the next due date and schedules a reminder 3
  days ahead. Reuses existing transaction data -- no separate subscriptions
  data model. Rescheduling with the same deterministic notification ID
  replaces any earlier prediction, so this safely re-runs after every import.

`NotificationOrchestrator.onTransactionsImported(newTransactions,
allTransactions, budgets)` is the single entry point, called from both
`SmsSyncWorker.sync()` (manual scan) and `backgroundSmsTask.ts` (real-time
listener) right after new transactions are persisted. It no-ops if there are
no new transactions, if the user hasn't enabled the "Smart Notifications"
Settings toggle, or if the OS denies the `POST_NOTIFICATIONS`
permission -- and never throws into the caller's import flow even if a
sub-check fails internally.

## Known limitation: reminders don't survive a device reboot

Notifee's trigger notifications are backed by Android's `AlarmManager`, which
clears all pending alarms on reboot. Rescheduling them on boot needs a
`RECEIVE_BOOT_COMPLETED` broadcast receiver that re-runs
`BillReminderService.scheduleUpcomingReminders()` -- not built in this pass
(the installed Notifee version, `7.8.2`, doesn't bundle one automatically).
Practical impact: a scheduled bill reminder is silently lost if the phone
reboots between when it was scheduled and its trigger time. Budget alerts and
salary notifications are unaffected -- they fire immediately at import time,
they're never "pending."
