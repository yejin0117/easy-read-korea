export type Level = "elementary" | "middle" | "learner";

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "elementary", label: "초등학생", hint: "짧은 문장, 아주 쉬운 말" },
  { id: "middle", label: "중학생", hint: "자연스러운 문장, 용어는 풀어서" },
  { id: "learner", label: "한국어 학습자", hint: "기본 단어, 한 문장에 한 가지" },
];

export function levelLabel(level: Level): string {
  return LEVELS.find((l) => l.id === level)?.label ?? "";
}
