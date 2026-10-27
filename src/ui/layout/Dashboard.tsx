import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import type { MonitorIdentity } from '../../api/resources/ApiPayload.ts';
import type { NavigationState } from '../navigation/NavigationController.ts';
import type { ScreenProps } from './ScreenProps.ts';
import { LayoutPolicy } from './LayoutPolicy.ts';
import { ScreenHost } from './ScreenHost.tsx';
import { Header } from '../components/Header.tsx';
import { Navigation } from '../components/Navigation.tsx';
import { Footer } from '../components/Footer.tsx';
import { palette } from '../theme/palette.ts';

export interface DashboardProps extends ScreenProps {
  readonly identity: MonitorIdentity;
  readonly navigation: NavigationState;
  readonly interval: number;
  readonly paused: boolean;
  readonly motion: boolean;
  readonly remote: string | null;
  readonly endpoint: string | null;
}

/** Pure composition makes identical layouts available to live and snapshot modes. */
export class Dashboard extends PureComponent<DashboardProps> {
  public override render(): ReactNode {
    const { width, height, identity, navigation, remote, endpoint, snapshot } = this.props;
    const layout = new LayoutPolicy(width, height);
    if (!layout.supported) return <Box width={width} height={height} flexDirection="column"><Text bold color={palette.cpu}>mTUI</Text><Text color={palette.muted}>Resize to at least 70 columns × 24 rows.</Text><Text color={palette.faint}>Q to quit · --once for a printable overview</Text></Box>;
    return <Box width={width} height={height} flexDirection="column" overflow="hidden">
      <Header identity={identity} height={layout.headerHeight} remote={remote} endpoint={endpoint} uptime={snapshot.uptime} />
      <Navigation view={navigation.view} help={navigation.help} />
      <ScreenHost {...this.props} height={layout.bodyHeight} view={navigation.view} help={navigation.help} />
      <Footer snapshot={snapshot} interval={this.props.interval} paused={this.props.paused} motion={this.props.motion} ascii={this.props.ascii} width={width} />
    </Box>;
  }
}
