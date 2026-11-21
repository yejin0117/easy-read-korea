import { BookmarkCheck, Check, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buildQuiz, canMakeQuiz, type QuizQuestion, type QuizWord } from "@/lib/quiz";
import { addVocab, useCollection, vocabStore } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Props {
  words: QuizWord[];
  /** 단어장에 저장할 때 출처로 쓰는 기록 제목 */
  source: string;
}

/** 변환 결과의 어려운 단어로 푸는 퀴즈. 퀴즈 중에도 단어를 단어장에 담을 수 있습니다. */
export function WordQuiz({ words, source }: Props) {
  const vocab = useCollection(vocabStore);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrongWords, setWrongWords] = useState<QuizWord[]>([]);
  const [score, setScore] = useState(0);

  const isSaved = (w: QuizWord) => vocab.some((v) => v.word === w.word && v.source === source);
  const save = (w: QuizWord) => {
    addVocab({ word: w.word, easy: w.easy, meaning: w.meaning, sentence: w.sentence, source });
  };

  // 문제는 버튼을 눌렀을 때(브라우저에서) 만들어서, 서버 렌더링과 화면이 어긋나지 않게 함
  const start = () => {
    setQuestions(buildQuiz(words));
    setIndex(0);
    setPicked(null);
    setWrongWords([]);
    setScore(0);
  };

  if (!canMakeQuiz(words)) return null;

  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8" aria-labelledby="quiz-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="quiz-title" className="text-[1.375rem]">
          어려운 단어 퀴즈
        </h3>
        {questions && index < questions.length ? (
          <p className="text-base font-semibold text-muted-foreground">
            {index + 1} / {questions.length}
          </p>
        ) : null}
      </div>

      {!questions ? (
        <div className="mt-3 space-y-4">
          <p>
            방금 읽은 글의 어려운 단어를 얼마나 기억하는지 확인해 보세요. 쉬운 말을 고르면 돼요.
          </p>
          <Button onClick={start}>퀴즈 시작하기</Button>
        </div>
      ) : index < questions.length ? (
        <QuestionView
          key={index}
          q={questions[index] as QuizQuestion}
          picked={picked}
          saved={isSaved((questions[index] as QuizQuestion).item)}
          isLast={index === questions.length - 1}
          onPick={(choice) => {
            if (picked !== null) return;
            const q = questions[index] as QuizQuestion;
            setPicked(choice);
            if (choice === q.answerIndex) setScore((s) => s + 1);
            else setWrongWords((ws) => [...ws, q.item]);
          }}
          onSave={() => {
            const w = (questions[index] as QuizQuestion).item;
            save(w);
            toast.success(`‘${w.word}’을(를) 단어장에 넣었어요.`);
          }}
          onNext={() => {
            setIndex((i) => i + 1);
            setPicked(null);
          }}
        />
      ) : (
        <ResultSummary
          total={questions.length}
          score={score}
          wrongWords={wrongWords}
          isSaved={isSaved}
          onSaveAll={() => {
            const toSave = wrongWords.filter((w) => !isSaved(w));
            toSave.forEach(save);
            toast.success(`틀린 단어 ${toSave.length}개를 단어장에 넣었어요.`);
          }}
          onRetry={start}
        />
      )}
    </div>
  );
}

function QuestionView({
  q,
  picked,
  saved,
  isLast,
  onPick,
  onSave,
  onNext,
}: {
  q: QuizQuestion;
  picked: number | null;
  saved: boolean;
  isLast: boolean;
  onPick: (choice: number) => void;
  onSave: () => void;
  onNext: () => void;
}) {
  const answered = picked !== null;
  const correct = picked === q.answerIndex;

  return (
    <div className="mt-4 space-y-5">
      <p className="text-[1.25rem]">
        <span className="font-bold">‘{q.item.word}’</span>의 쉬운 말은 무엇일까요?
      </p>

      <div role="group" aria-label="보기" className="grid gap-3 sm:grid-cols-2">
        {q.choices.map((choice, i) => {
          const isAnswer = i === q.answerIndex;
          const isPicked = i === picked;
          return (
            <button
              key={choice}
              type="button"
              disabled={answered}
              aria-pressed={isPicked}
              onClick={() => onPick(i)}
              className={cn(
                "flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !answered &&
                  "border-border bg-background hover:border-primary hover:bg-primary-soft",
                answered && isAnswer && "border-primary bg-primary-soft font-semibold",
                answered && isPicked && !isAnswer && "border-destructive bg-destructive-soft",
                answered && !isPicked && !isAnswer && "border-border opacity-60",
              )}
            >
              <span>{choice}</span>
              {answered && isAnswer ? (
                <span className="inline-flex items-center gap-1 text-base text-primary">
                  <Check className="size-5" aria-hidden="true" />
                  정답
                </span>
              ) : null}
              {answered && isPicked && !isAnswer ? (
                <span className="inline-flex items-center gap-1 text-base text-destructive">
                  <X className="size-5" aria-hidden="true" />
                  내가 고른 답
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {answered ? (
          <div
            className={cn(
              "space-y-2 rounded-xl border p-4",
              correct
                ? "border-primary/30 bg-primary-soft"
                : "border-destructive/35 bg-destructive-soft",
            )}
          >
            <p className={cn("text-lg font-bold", correct ? "text-primary" : "text-destructive")}>
              {correct ? "맞았어요!" : `아쉬워요. 정답은 ‘${q.item.easy}’예요.`}
            </p>
            <p>
              <span className="font-semibold">{q.item.word}</span>: {q.item.meaning}
            </p>
            {q.item.sentence ? (
              <p className="text-base text-muted-foreground">나온 문장: “{q.item.sentence}”</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {answered ? (
        <div className="flex flex-wrap gap-3">
          {saved ? (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-base font-semibold text-primary">
              <BookmarkCheck className="size-5" aria-hidden="true" />
              단어장에 있어요
            </span>
          ) : (
            <Button
              variant="outline"
              onClick={onSave}
              aria-label={`${q.item.word}을(를) 단어장에 넣기`}
            >
              <Plus aria-hidden="true" />
              단어장에 넣기
            </Button>
          )}
          <Button onClick={onNext}>{isLast ? "결과 보기" : "다음 문제"}</Button>
        </div>
      ) : null}
    </div>
  );
}

function ResultSummary({
  total,
  score,
  wrongWords,
  isSaved,
  onSaveAll,
  onRetry,
}: {
  total: number;
  score: number;
  wrongWords: QuizWord[];
  isSaved: (w: QuizWord) => boolean;
  onSaveAll: () => void;
  onRetry: () => void;
}) {
  const unsaved = wrongWords.filter((w) => !isSaved(w));
  return (
    <div className="mt-4 space-y-5" aria-live="polite">
      <p className="text-[1.25rem] font-bold">
        {total}문제 중 <span className="text-primary">{score}문제</span>를 맞혔어요.
      </p>

      {wrongWords.length > 0 ? (
        <div className="space-y-3">
          <p className="font-semibold">다시 볼 단어</p>
          <ul className="divide-y rounded-xl border">
            {wrongWords.map((w) => (
              <li
                key={w.word}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <span>
                  <span className="font-bold">{w.word}</span>
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only">의 쉬운 말은 </span>
                  <span className="font-semibold text-primary">{w.easy}</span>
                </span>
                {isSaved(w) ? (
                  <span className="text-base text-muted-foreground">단어장에 있어요</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>모두 맞혔어요. 어려운 단어를 잘 이해했어요!</p>
      )}

      <div className="flex flex-wrap gap-3">
        {unsaved.length > 0 ? (
          <Button onClick={onSaveAll}>
            <Plus aria-hidden="true" />
            틀린 단어 {unsaved.length}개 단어장에 넣기
          </Button>
        ) : null}
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          다시 풀기
        </Button>
      </div>
    </div>
  );
}
