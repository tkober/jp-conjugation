/** Word-type labels shared between the stats heatmap and the practice verdict.
 *
 *  `TYPE_LABELS` is the compact 一段/五段/… chip used as a column header where
 *  space is tight; `TYPE_TITLES` is the spelled-out English name used
 *  wherever there's room (table titles, the verdict card). */
export const TYPE_LABELS: Record<string, string> = {
  ichidan_verb: '一段',
  godan_verb: '五段',
  suru_verb: 'する',
  kuru_verb: '来る',
  i_adjective: 'い',
  na_adjective: 'な',
};

export const TYPE_TITLES: Record<string, string> = {
  ichidan_verb: 'Ichidan verb',
  godan_verb: 'Godan verb',
  suru_verb: 'Suru verb',
  kuru_verb: 'Kuru verb',
  i_adjective: 'I-adjective',
  na_adjective: 'Na-adjective',
};

export function wordTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function wordTypeTitle(type: string): string {
  return TYPE_TITLES[type] ?? type;
}
