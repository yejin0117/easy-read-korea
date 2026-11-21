/**
 * 어려운 단어 퀴즈: 단어 풀이 목록으로 "이 단어의 쉬운 말은?" 문제를 만듭니다.
 * 보기는 같은 글에 나온 다른 단어들의 쉬운 말로 채웁니다.
 */

export interface QuizWord {
  /** 내 단어장 퀴즈일 때 단어장 항목 id */
  id?: string;
  word: string;
  easy: string;
  meaning: string;
  sentence: string;
}

export interface QuizQuestion {
  item: QuizWord;
  /** 보기(쉬운 말) — 정답 1개 + 오답 최대 3개, 섞인 순서 */
  choices: string[];
  answerIndex: number;
}

export const MIN_QUIZ_WORDS = 2;
const MAX_QUESTIONS = 5;
const MAX_CHOICES = 4;

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out.at(i) as T;
    out[i] = out.at(j) as T;
    out[j] = a;
  }
  return out;
}

/** 쉬운 말이 겹치지 않는 단어만 남깁니다(보기가 같아지면 문제가 성립하지 않음). */
function usable(words: QuizWord[]): QuizWord[] {
  const seen = new Set<string>();
  return words.filter((w) => {
    const key = w.easy.trim();
    if (!w.word.trim() || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function canMakeQuiz(words: QuizWord[]): boolean {
  return usable(words).length >= MIN_QUIZ_WORDS;
}

export function buildQuiz(words: QuizWord[], random: () => number = Math.random): QuizQuestion[] {
  const pool = usable(words);
  if (pool.length < MIN_QUIZ_WORDS) return [];
  return shuffle(pool, random)
    .slice(0, MAX_QUESTIONS)
    .map((item) => {
      const wrong = shuffle(
        pool.filter((w) => w.word !== item.word).map((w) => w.easy),
        random,
      ).slice(0, MAX_CHOICES - 1);
      const choices = shuffle([item.easy, ...wrong], random);
      return { item, choices, answerIndex: choices.indexOf(item.easy) };
    });
}
