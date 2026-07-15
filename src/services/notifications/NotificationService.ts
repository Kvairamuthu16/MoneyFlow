import notifee, { AndroidImportance, AuthorizationStatus, TimestampTrigger, TriggerType } from '@notifee/react-native';

const CHANNEL_ID = 'moneyflow-alerts';
let channelReady: Promise<void> | undefined;

/**
 * Thin wrapper over Notifee -- the only file in the app that imports it
 * directly. All local notifications (budget alerts, salary credits, bill
 * reminders) go through here so channel setup and permission handling stay
 * in one place.
 */
export const NotificationService = {
  async requestPermission(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED || settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
  },

  ensureChannel(): Promise<void> {
    if (!channelReady) {
      channelReady = notifee
        .createChannel({ id: CHANNEL_ID, name: 'MoneyFlow Alerts', importance: AndroidImportance.HIGH })
        .then(() => undefined);
    }
    return channelReady;
  },

  /** Shows a notification immediately (budget threshold crossed, salary credited). */
  async displayNow(id: string, title: string, body: string): Promise<void> {
    await NotificationService.ensureChannel();
    await notifee.displayNotification({
      id,
      title,
      body,
      android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } }
    });
  },

  /**
   * Schedules a notification for a future timestamp (bill due soon). Reusing
   * the same `id` for the same predicted due date replaces any previously
   * scheduled reminder instead of duplicating it, so callers don't need to
   * track "did I already schedule this" themselves.
   */
  async scheduleAt(id: string, title: string, body: string, timestampMs: number): Promise<void> {
    await NotificationService.ensureChannel();
    const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: timestampMs };
    await notifee.createTriggerNotification({ id, title, body, android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } } }, trigger);
  },

  async cancel(id: string): Promise<void> {
    await notifee.cancelNotification(id);
  }
};
