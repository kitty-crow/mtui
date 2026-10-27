import { PureComponent, type ComponentType, type ReactNode } from 'react';
import type { ViewId } from '../navigation/NavigationController.ts';
import type { ScreenProps } from './ScreenProps.ts';
import { OverviewScreen } from '../screens/OverviewScreen.tsx';
import { GraphicsScreen } from '../screens/GraphicsScreen.tsx';
import { ProcessorScreen } from '../screens/ProcessorScreen.tsx';
import { MemoryScreen } from '../screens/MemoryScreen.tsx';
import { SensorsScreen } from '../screens/SensorsScreen.tsx';
import { HelpScreen } from '../screens/HelpScreen.tsx';

const screens: Readonly<Record<ViewId, ComponentType<ScreenProps>>> = {
  overview: OverviewScreen, graphics: GraphicsScreen, processor: ProcessorScreen, memory: MemoryScreen, sensors: SensorsScreen,
};

export class ScreenHost extends PureComponent<ScreenProps & { readonly view: ViewId; readonly help: boolean }> {
  public override render(): ReactNode {
    const Screen = this.props.help ? HelpScreen : screens[this.props.view];
    return <Screen {...this.props} />;
  }
}
