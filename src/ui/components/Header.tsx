import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import type { MonitorIdentity } from '../../api/resources/ApiPayload.ts';
import { MetricFormat as F } from '../format/MetricFormat.ts';
import { palette } from '../theme/palette.ts';

export const logo = [
  '           _____ _   _ ___ ',
  ' _ __ ___ |_   _| | | |_ _|',
  "| '_ ` _ \\  | | | | | || | ",
  '| | | | | | | | | |_| || | ',
  '|_| |_| |_| |_|  \\___/|___|',
].join('\n');

interface Props { readonly identity: MonitorIdentity; readonly height: number; readonly remote: string | null; readonly endpoint: string | null; readonly uptime: number }

export class Header extends PureComponent<Props> {
  public override render(): ReactNode {
    const { identity, height, remote, endpoint, uptime } = this.props;
    const mode = identity.demo ? 'DEMO · simulated telemetry' : remote === null ? 'LOCAL MONITOR' : 'REMOTE MONITOR';
    if (height === 1) return <Box justifyContent="space-between"><Text bold color={palette.cpu}> mTUI <Text color={palette.muted}>/ {F.label(identity.host.hostname)}</Text></Text><Text color={identity.demo ? palette.warning : palette.graphics}>{mode} </Text></Box>;
    return <Box height={height} paddingX={1} columnGap={3} flexShrink={0}>
      <Text color={palette.cpu}>{logo}</Text>
      <Box flexDirection="column" flexGrow={1}>
        <Text bold color={palette.text}>mTUI <Text color={palette.muted}>/ monitor TUI</Text></Text>
        <Text color={palette.muted} wrap="truncate-end">{F.label(identity.host.hostname)} · {identity.host.platform} {identity.host.architecture}</Text>
        <Text color={identity.demo ? palette.warning : palette.graphics}>{mode} · v{identity.version}</Text>
        <Text color={palette.muted} wrap="truncate-end">{remote === null ? endpoint ?? 'API disabled' : remote}</Text>
        <Text color={palette.faint}>UPTIME {F.duration(uptime)}</Text>
      </Box>
    </Box>;
  }
}
