/** Widget task-handler registration (Android). Call once at app entry. */
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { nowPlayingTaskHandler } from './task';

export function registerWidgets(): void {
  registerWidgetTaskHandler(nowPlayingTaskHandler);
}
