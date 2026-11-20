/**
 * 쉬운 글 표기법: "{쉬운 말|원래 말}" 은 바뀐 단어(형광펜)를 뜻합니다.
 * 빈 줄은 문단 구분, 문단의 첫 줄 다음에 줄바꿈이 있으면 첫 줄은 소제목으로 씁니다.
 */

export type Segment =
  | { type: "text"; text: string }
  | { type: "changed"; text: string; original: string };

const CHANGED = /\{([^|{}]+)\|([^{}]+)\}/g;
const HAS_CHANGED = /\{[^|{}]+\|[^{}]+\}/;

export function parseSegments(line: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of line.matchAll(CHANGED)) {
    const index = m.index ?? 0;
    if (index > last) segments.push({ type: "text", text: line.slice(last, index) });
    segments.push({ type: "changed", text: m[1] ?? "", original: m[2] ?? "" });
    last = index + m[0].length;
  }
  if (last < line.length) segments.push({ type: "text", text: line.slice(last) });
  return segments;
}

export interface Paragraph {
  heading: string | null;
  lines: Segment[][];
}

export function parseEasy(markup: string): Paragraph[] {
  return markup
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const rows = block.split("\n").map((r) => r.trim()).filter(Boolean);
      const first = rows[0] ?? "";
      const looksLikeHeading =
        rows.length > 1 && first.length <= 30 && !/[.。!?]$/.test(first) && !HAS_CHANGED.test(first);
      const heading = looksLikeHeading ? first : null;
      const body = heading ? rows.slice(1) : rows;
      return { heading, lines: body.map(parseSegments) };
    });
}

export function plainEasy(markup: string): string {
  return markup.replace(CHANGED, "$1");
}

export function countChanged(markup: string): number {
  return Array.from(markup.matchAll(CHANGED)).length;
}

/** 한글 글자에 받침이 있는지 */
export function hasBatchim(word: string): boolean {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}
