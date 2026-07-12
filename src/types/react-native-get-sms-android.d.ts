declare module 'react-native-get-sms-android' {
  interface SmsAndroidStatic {
    list(
      filter: string,
      onFailure: (fail: string) => void,
      onSuccess: (count: number, smsList: string) => void
    ): void;
  }

  const SmsAndroid: SmsAndroidStatic;
  export default SmsAndroid;
}
