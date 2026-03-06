/**
 * Maps a section index to a LyraCompanion stage (0-16), skipping the
 * 'awakening' divider which is not a companion stage.
 */
export function computeCompanionStage(sectionIndex: number, awakeningIdx: number): number {
  return sectionIndex > awakeningIdx ? sectionIndex - 1 : Math.min(sectionIndex, awakeningIdx - 1)
}
