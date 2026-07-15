import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { NotificationService } from '../../src/services/notifications/NotificationService';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats AUTHORIZED as permission granted', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValue({ authorizationStatus: AuthorizationStatus.AUTHORIZED });
    expect(await NotificationService.requestPermission()).toBe(true);
  });

  it('treats PROVISIONAL as permission granted', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValue({ authorizationStatus: AuthorizationStatus.PROVISIONAL });
    expect(await NotificationService.requestPermission()).toBe(true);
  });

  it('treats DENIED as permission not granted', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValue({ authorizationStatus: AuthorizationStatus.DENIED });
    expect(await NotificationService.requestPermission()).toBe(false);
  });

  it('displays an immediate notification on the alerts channel', async () => {
    await NotificationService.displayNow('id-1', 'Title', 'Body');

    expect(notifee.createChannel).toHaveBeenCalled();
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id-1', title: 'Title', body: 'Body' })
    );
  });

  it('schedules a trigger notification at the given timestamp', async () => {
    const timestamp = Date.now() + 100000;
    await NotificationService.scheduleAt('id-2', 'Title', 'Body', timestamp);

    expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id-2', title: 'Title', body: 'Body' }),
      expect.objectContaining({ timestamp })
    );
  });

  it('cancels a notification by id', async () => {
    await NotificationService.cancel('id-3');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('id-3');
  });
});
