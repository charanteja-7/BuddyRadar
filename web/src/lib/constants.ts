export const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🐧", "🦄", "🐙", "🦋", "🐯", "🦅", "🐺", "🦈"];

export const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#A8FF78",
  "#7FDBDA",
  "#C9B1FF",
  "#FF9A9E",
  "#56CCF2",
  "#F7971E",
  "#43B89C",
  "#6C63FF",
  "#00D2FF",
];

export function pickDeterministicColor(seed: string): string {
  const chars = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COLORS[chars % COLORS.length];
}

export function pickDeterministicAvatar(seed: string): string {
  const chars = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATARS[chars % AVATARS.length];
}
