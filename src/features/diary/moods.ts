import type { DiaryMood } from '@shared/types'

export const MOODS: Array<{ value: DiaryMood; emoji: string; label: string }> = [
  { value: 1, emoji: '😞', label: 'Awful' },
  { value: 2, emoji: '🙁', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
]

export function moodLabel(mood: DiaryMood): { emoji: string; label: string } {
  return MOODS.find((item) => item.value === mood) ?? MOODS[2]
}
