import { registerRootComponent } from 'expo';

import App from './App';
import { registerWidgets } from './src/widget/register';

// Register the home-screen widget task handler before the app mounts (headless-safe).
// No-op on web/iOS via the platform-split register module.
registerWidgets();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
