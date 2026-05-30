export const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8B4D9',
  '#A8E6CF',
  '#FFB347',
  '#B19CD9',
  '#FF8C94',
]

let colorIndex = 0

export function getNextColor(): string {
  const color = USER_COLORS[colorIndex % USER_COLORS.length]
  colorIndex++
  return color
}
