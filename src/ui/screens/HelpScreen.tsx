import { PureComponent, type ReactNode } from 'react';
import { Text } from 'ink';
import { Panel } from '../components/Panel.tsx';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { palette } from '../theme/palette.ts';
import { MetricFormat } from '../format/MetricFormat.ts';

export class HelpScreen extends PureComponent<ScreenProps> {
  public override render(): ReactNode {
    return <Panel title="KEYBOARD & TELEMETRY" accent={palette.sensors} hint="? or Esc to return" height={this.props.height} ascii={this.props.ascii}>
      <Text color={palette.text}>{[
        '1–5          Overview / Graphics / Processor / Memory / Sensors',
        'Tab          Next view (Shift+Tab goes back)',
        '↑ / ↓, J / K Scroll the current table',
        'PgUp / PgDn  Scroll one page · Home returns to the first row',
        '← / →        Select the graphics adapter shown in detail',
        'P            Pause or resume the monitor (API reports paused)',
        'R            Request a fresh sample',
        '+ / -        Faster / slower sampling, 250 ms to 10 s',
        'Q / Ctrl+C   Exit and restore the terminal',
        '',
        'N/A means no reading was reported. Zero is a real measurement.',
        'STALE retains a previous reading after a collector error.',
        'Fan percentages describe duty; sensor fan speeds use RPM.',
        'Charts show sampled history. Gaps mark unavailable readings.',
      ].join('\n')}</Text>
      {Object.entries(this.props.snapshot.readings).filter(([, reading]) => reading.message !== null).slice(0, Math.max(0, this.props.height - 18)).map(([name, reading]) => <Text key={name} color={palette.warning} wrap="truncate-end">{name}: {MetricFormat.label(reading.message ?? '')}</Text>)}
    </Panel>;
  }
}
