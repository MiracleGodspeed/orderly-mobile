import { ReanimatedLogLevel, configureReanimatedLogger } from 'react-native-reanimated';

// Disable strict mode warnings to keep terminal clean
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
