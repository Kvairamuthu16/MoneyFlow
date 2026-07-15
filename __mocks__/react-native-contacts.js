// Manual Jest mock for react-native-contacts: a native module with no
// implementation available under Jest. Tests that need specific contacts
// should stub these functions directly (jest.spyOn/mockResolvedValue).
module.exports = {
  getAll: jest.fn(async () => []),
  getAllWithoutPhotos: jest.fn(async () => []),
  getContactById: jest.fn(async () => null),
  getCount: jest.fn(async () => 0),
  getContactsMatchingString: jest.fn(async () => []),
  getContactsByPhoneNumber: jest.fn(async () => []),
  getContactsByEmailAddress: jest.fn(async () => []),
  checkPermission: jest.fn(async () => 'authorized'),
  requestPermission: jest.fn(async () => 'authorized')
};
