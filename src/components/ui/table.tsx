// Class names shared by every table, so they all look and size the same.
// Use inside <CardContent flush> with a scrolling wrapper (tbl.scroll).
export const tbl = {
  scroll: 'overflow-auto',
  table: 'type-sub w-full border-separate border-spacing-0',
  tr: 'group/row',
  th: 'type-foot sticky top-0 z-10 border-b bg-(--cell-bg) px-3 py-2.5 text-right font-medium whitespace-nowrap text-muted-foreground backdrop-blur-xl',
  thFirst: 'type-foot sticky top-0 left-0 z-20 border-r border-b bg-(--cell-bg) px-3 backdrop-blur-xl py-2.5 text-left font-medium whitespace-nowrap text-muted-foreground',
  rowHead: 'sticky left-0 z-10 border-r border-b bg-(--cell-bg) p-0 text-left font-medium whitespace-nowrap backdrop-blur-xl transition-colors group-hover/row:bg-primary/10',
  rowHeadPad: 'px-3 py-2.5',
  td: 'border-b px-3 py-2.5 text-right whitespace-nowrap tabular-nums transition-colors group-hover/row:bg-primary/8',
  tdBare: 'border-b p-0 text-right tabular-nums transition-colors group-hover/row:bg-primary/8',
  // a tappable cell: fills the whole <td>
  cellBtn: 'block w-full px-3 py-2.5 whitespace-nowrap outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/15',
  footHead: 'sticky bottom-0 left-0 z-20 border-t border-r bg-(--cell-bg) px-3 backdrop-blur-xl py-3 text-left font-semibold whitespace-nowrap',
  footTd: 'sticky bottom-0 z-10 border-t bg-(--cell-bg) px-3 backdrop-blur-xl py-3 text-right font-semibold whitespace-nowrap tabular-nums',
  empty: 'text-tertiary',
}
