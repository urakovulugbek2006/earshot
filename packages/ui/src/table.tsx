/**
 * The data table. ADR-0011 replaced shelves of cover art with this, so it is
 * the main way the catalog is browsed — which makes it the component most
 * worth getting right.
 *
 * A real <table>, not a grid of divs: a screen reader announces the column a
 * cell belongs to, and that is free only if the markup is honest.
 */
import type { ReactNode } from 'react';

export type Column<Row> = {
  key: string;
  header: string;
  /** Right-align numbers; left-align text. Numbers are mono either way. */
  align?: 'left' | 'right';
  /** Fixed width where the content is predictable, e.g. BPM or a track number. */
  width?: string;
  render: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  minWidth = 760,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Describes the table for screen readers; visually hidden. */
  caption: string;
  minWidth?: number;
}) {
  return (
    // The one place a horizontal scroll is allowed: a wide table on a narrow
    // screen scrolls inside its own box rather than making the page scroll.
    <div className="overflow-x-auto rounded-sm border border-hair bg-surface">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-strong">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={
                  'px-2.5 py-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.11em] text-muted ' +
                  (c.align === 'right' ? 'text-right' : 'text-left')
                }
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-hair last:border-b-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={
                    'px-2.5 py-2 align-middle text-[13px] ' +
                    (c.align === 'right' ? 'text-right' : 'text-left')
                  }
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
