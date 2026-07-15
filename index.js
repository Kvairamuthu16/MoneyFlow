import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import backgroundSmsTask from './src/services/sms/backgroundSmsTask';

AppRegistry.registerComponent(appName, () => App);
// Task name must match SmsHeadlessTaskService.kt's HeadlessJsTaskConfig exactly.
AppRegistry.registerHeadlessTask('SmsBackgroundImport', () => backgroundSmsTask);
