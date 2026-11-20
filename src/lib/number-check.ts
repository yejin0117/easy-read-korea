/**
 * 변환 오류 확인: 원문과 쉬운 글의 숫자·날짜를 비교합니다.
 * 숫자 표기만 비교하며, 문장의 뜻이 맞는지는 검사하지 않습니다.
 */

export function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return matches
    .map((m) => m.replace(/,/g, ""))
    .filter((m) => m.length > 0)
    .map((m) => m.replace(/^0+(?=\d)/, ""));
}

export interface NumberCheckResult {
  /** 원문에 나온 숫자(중복 제거, 나온 순서) */
  checked: string[];
  /** 원문에는 있는데 쉬운 글에는 없는 숫자 */
  missing: string[];
  /** 원문에는 없는데 쉬운 글(또는 요약)에 새로 생긴 숫자 */
  added: string[];
  ok: boolean;
}

function unique(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function checkNumbers(original: string, easy: string, extra: string[] = []): NumberCheckResult {
  const originalNums = unique(extractNumbers(original));
  const easyNums = new Set(extractNumbers(easy));
  const outputNums = unique([...extractNumbers(easy), ...extra.flatMap(extractNumbers)]);
  const originalSet = new Set(originalNums);

  const missing = originalNums.filter((n) => !easyNums.has(n));
  const added = outputNums.filter((n) => !originalSet.has(n));

  return { checked: originalNums, missing, added, ok: missing.length === 0 && added.length === 0 };
}
