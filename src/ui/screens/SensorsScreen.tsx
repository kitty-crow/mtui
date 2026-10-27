import { PureComponent, type ReactNode } from 'react';
import { Text } from 'ink';
import { SensorCatalogue } from '../../monitoring/SensorCatalogue.ts';
import { SensorColumns } from '../sensors/SensorColumns.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { Panel } from '../components/Panel.tsx';
import { ReadingNotice } from '../components/ReadingNotice.tsx';
import type { ScreenProps } from '../layout/ScreenProps.ts';
import { palette } from '../theme/palette.ts';

export class SensorsScreen extends PureComponent<ScreenProps> {
  private readonly catalogue = new SensorCatalogue();
  private readonly columns = new SensorColumns();
  public override render(): ReactNode {
    const { snapshot, width, height, ascii, offset } = this.props;
    const sensors = this.catalogue.list(snapshot);
    return <Panel title="HARDWARE SENSORS" accent={palette.sensors} hint={`${sensors.length} channels`} height={height} ascii={ascii}>
      <Text color={palette.faint}>Reported temperatures, fan speeds, power and voltages.</Text>
      <ReadingNotice reading={snapshot.readings.sensors} empty={sensors.length === 0 ? 'No sensors are currently exposed by this host.' : undefined} />
      <DataTable rows={sensors} columns={this.columns.build(width - 4)} rowKey={sensor => sensor.id} offset={offset} limit={Math.max(1, height - 7)} />
    </Panel>;
  }
}
