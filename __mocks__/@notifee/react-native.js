// Manual Jest mock for @notifee/react-native: a native module with no
// implementation available under Jest.
const AndroidImportance = { NONE: 0, MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4 };
const AuthorizationStatus = { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 };
const TriggerType = { TIMESTAMP: 0, INTERVAL: 1 };

const notifee = {
  requestPermission: jest.fn(async () => ({ authorizationStatus: AuthorizationStatus.AUTHORIZED })),
  createChannel: jest.fn(async () => 'moneyflow-alerts'),
  displayNotification: jest.fn(async () => 'notification-id'),
  createTriggerNotification: jest.fn(async () => 'trigger-id'),
  cancelNotification: jest.fn(async () => undefined)
};

module.exports = {
  __esModule: true,
  default: notifee,
  AndroidImportance,
  AuthorizationStatus,
  TriggerType
};
