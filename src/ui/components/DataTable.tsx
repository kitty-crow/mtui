import { PureComponent, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme/palette.ts';

export interface Column<T> {
  readonly title: string;
  readonly width: number;
  readonly render: (row: T, index: number) => ReactNode;
}

interface Props<T> {
  readonly rows: readonly T[];
  readonly columns: readonly Column<T>[];
  readonly rowKey: (row: T, index: number) => string;
  readonly selected?: number;
  readonly offset?: number;
  readonly limit: number;
}

/** Columns have cell widths, so long driver names cannot shift numeric values. */
export class DataTable<T> extends PureComponent<Props<T>> {
  public override render(): ReactNode {
    const { rows, columns, rowKey, selected, offset = 0, limit } = this.props;
    const start = Math.min(Math.max(0, offset), Math.max(0, rows.length - limit));
    return <Box flexDirection="column" flexShrink={0}>
      <Box>{columns.map((column, index) => <Box key={index} width={column.width} flexShrink={0}><Text bold color={palette.muted} wrap="truncate-end">{column.title}</Text></Box>)}</Box>
      {rows.slice(start, start + limit).map((row, index) => <Box key={rowKey(row, start + index)}>
        {columns.map((column, columnIndex) => <Box key={columnIndex} width={column.width} flexShrink={0}>
          <Text color={selected === start + index ? palette.graphics : palette.text} bold={selected === start + index} wrap="truncate-end">{column.render(row, start + index)}</Text>
        </Box>)}
      </Box>)}
      {rows.length > limit && <Text color={palette.faint}>{start + 1}–{Math.min(rows.length, start + limit)} of {rows.length} · ↑↓ scroll</Text>}
    </Box>;
  }
}
