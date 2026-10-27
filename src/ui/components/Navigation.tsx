import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import type { ViewId } from '../navigation/NavigationController.ts';
import { palette } from '../theme/palette.ts';

const tabs = [
  { id: 'overview', label: '1 Overview', colour: palette.text },
  { id: 'graphics', label: '2 GPU', colour: palette.graphics },
  { id: 'processor', label: '3 CPU', colour: palette.cpu },
  { id: 'memory', label: '4 RAM', colour: palette.memory },
  { id: 'sensors', label: '5 Sensors', colour: palette.sensors },
] as const;

export class Navigation extends PureComponent<{ readonly view: ViewId; readonly help: boolean }> {
  public override render(): ReactNode {
    return <Box height={2} paddingX={1} columnGap={2} flexShrink={0} alignItems="center">
      {tabs.map(tab => <Text key={tab.id} bold={this.props.view === tab.id} inverse={this.props.view === tab.id && !this.props.help} color={tab.colour}> {tab.label} </Text>)}
      <Text color={this.props.help ? palette.sensors : palette.faint}>?</Text>
    </Box>;
  }
}
