import { BookmarkCheck, Check, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildQuiz, canMakeQuiz, type QuizQuestion, type QuizWord } from "@/lib/quiz";
import { addVocab, setVocabStatus, useCollection, vocabStore, type VocabItem } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * result: 변환 결과의 단어로 푸는 퀴즈 — 단어를 단어장에 담을 수 있음
 * vocab: 내 단어장 단어로 푸는 퀴즈 — '다 외웠어요/외우는 중' 표시를 바꿀 수 있음
 */
export type QuizMode = { kind: "result"; source: string } | { kind: "vocab" };

/** 변환 결과의 '어려운 단어 풀이' 위에 놓는 퀴즈 안내 카드 */
export function WordQuizCard({ words, source }: { words: QuizWord[]; source: string }) {
  const [open, setOpen] = useState(false);
  if (!canMakeQuiz(words)) return null;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div>
        <h3 className="text-[1.375rem]">어려운 단어 퀴즈</h3>
        <p className="mt-1">
          방금 읽은 글의 어려운 단어를 얼마나 기억하는지 확인해 보세요. 쉬운 말을 고르면 돼요.
        </p>
      </div>
      <Button className="shrink-0 self-start md:self-center" onClick={() => setOpen(true)}>
        퀴즈 풀기
      </Button>
      <WordQuizDialog
        open={open}
        onOpenChange={setOpen}
        title="어려운 단어 퀴즈"
        words={words}
        mode={{ kind: "result", source }}
      />
    </div>
  );
}

/** 퀴즈 모달. 닫기(X), '그만하기', Esc, 바깥 클릭으로 언제든 나갈 수 있음 */
export function WordQuizDialog({
  open,
  onOpenChange,
  title,
  words,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  words: QuizWord[];
  mode: QuizMode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl sm:rounded-2xl">
        <DialogTitle className="text-[1.375rem] font-bold">{title}</DialogTitle>
        <DialogDescription className="text-base">
          단어의 쉬운 말을 골라 보세요. 언제든 닫고 나갈 수 있어요.
        </DialogDescription>
        {/* 열 때마다 새 문제로 시작 */}
        {open ? <QuizRunner words={words} mode={mode} onExit={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function savedInResult(vocab: VocabItem[], w: QuizWord, source: string) {
  return vocab.some((v) => v.word === w.word && v.source === source);
}

function saveToVocab(w: QuizWord, source: string) {
  addVocab({ word: w.word, easy: w.easy, meaning: w.meaning, sentence: w.sentence, source });
}

function QuizRunner({
  words,
  mode,
  onExit,
}: {
  words: QuizWord[];
  mode: QuizMode;
  onExit: () => void;
}) {
  const vocab = useCollection(vocabStore);
  // 문제는 모달을 연 뒤(브라우저에서) 만들어서 서버 렌더링과 어긋나지 않게 함
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => buildQuiz(words));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrongWords, setWrongWords] = useState<QuizWord[]>([]);
  const [rightWords, setRightWords] = useState<QuizWord[]>([]);

  const restart = () => {
    setQuestions(buildQuiz(words));
    setIndex(0);
    setPicked(null);
    setWrongWords([]);
    setRightWords([]);
  };

  const q = questions.at(index);

  if (!q) {
    return (
      <ResultSummary
        total={questions.length}
        wrongWords={wrongWords}
        rightWords={rightWords}
        mode={mode}
        vocab={vocab}
        onRetry={restart}
        onExit={onExit}
      />
    );
  }

  const answered = picked !== null;
  const correct = picked === q.answerIndex;

  return (
    <div className="space-y-5">
      <p className="text-base font-semibold text-muted-foreground">
        {index + 1} / {questions.length}
      </p>
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
              onClick={() => {
                setPicked(i);
                if (isAnswer) setRightWords((ws) => [...ws, q.item]);
                else setWrongWords((ws) => [...ws, q.item]);
              }}
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
                <span className="inline-flex shrink-0 items-center gap-1 text-base text-primary">
                  <Check className="size-5" aria-hidden="true" />
                  정답
                </span>
              ) : null}
              {answered && isPicked && !isAnswer ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-base text-destructive">
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

      <div className="flex flex-wrap items-center gap-3">
        {answered ? <WordAction word={q.item} mode={mode} vocab={vocab} /> : null}
        {answered ? (
          <Button
            onClick={() => {
              setIndex((i) => i + 1);
              setPicked(null);
            }}
          >
            {index === questions.length - 1 ? "결과 보기" : "다음 문제"}
          </Button>
        ) : null}
        <Button variant="ghost" className="ml-auto" onClick={onExit}>
          그만하기
        </Button>
      </div>
    </div>
  );
}

/** 문제마다 단어에 할 수 있는 일: 결과 퀴즈는 '단어장에 넣기', 단어장 퀴즈는 '다 외웠어요' 전환 */
function WordAction({ word, mode, vocab }: { word: QuizWord; mode: QuizMode; vocab: VocabItem[] }) {
  if (mode.kind === "result") {
    return savedInResult(vocab, word, mode.source) ? (
      <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-base font-semibold text-primary">
        <BookmarkCheck className="size-5" aria-hidden="true" />
        단어장에 있어요
      </span>
    ) : (
      <Button
        variant="outline"
        aria-label={`${word.word}을(를) 단어장에 넣기`}
        onClick={() => {
          saveToVocab(word, mode.source);
          toast.success(`‘${word.word}’을(를) 단어장에 넣었어요.`);
        }}
      >
        <Plus aria-hidden="true" />
        단어장에 넣기
      </Button>
    );
  }
  const item = vocab.find((v) => v.id === word.id);
  if (!item) return null;
  return item.status === "done" ? (
    <Button variant="outline" onClick={() => setVocabStatus(item.id, "learning")}>
      <RotateCcw aria-hidden="true" />
      다시 외우기
    </Button>
  ) : (
    <Button variant="outline" onClick={() => setVocabStatus(item.id, "done")}>
      <Check aria-hidden="true" />다 외웠어요
    </Button>
  );
}

function ResultSummary({
  total,
  wrongWords,
  rightWords,
  mode,
  vocab,
  onRetry,
  onExit,
}: {
  total: number;
  wrongWords: QuizWord[];
  rightWords: QuizWord[];
  mode: QuizMode;
  vocab: VocabItem[];
  onRetry: () => void;
  onExit: () => void;
}) {
  const unsaved =
    mode.kind === "result" ? wrongWords.filter((w) => !savedInResult(vocab, w, mode.source)) : [];
  const status = (w: QuizWord) => vocab.find((v) => v.id === w.id)?.status;
  const wrongToLearn = mode.kind === "vocab" ? wrongWords.filter((w) => status(w) === "done") : [];
  const rightToDone =
    mode.kind === "vocab" ? rightWords.filter((w) => status(w) === "learning") : [];

  return (
    <div className="space-y-5" aria-live="polite">
      <p className="text-[1.25rem] font-bold">
        {total}문제 중 <span className="text-primary">{rightWords.length}문제</span>를 맞혔어요.
      </p>

      {wrongWords.length > 0 ? (
        <div className="space-y-3">
          <p className="font-semibold">다시 볼 단어</p>
          <ul className="divide-y rounded-xl border">
            {wrongWords.map((w) => (
              <li key={w.id ?? w.word} className="px-4 py-3">
                <span className="font-bold">{w.word}</span>
                <span aria-hidden="true"> → </span>
                <span className="sr-only">의 쉬운 말은 </span>
                <span className="font-semibold text-primary">{w.easy}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>모두 맞혔어요. 어려운 단어를 잘 이해했어요!</p>
      )}

      <div className="flex flex-wrap gap-3">
        {mode.kind === "result" && unsaved.length > 0 ? (
          <Button
            onClick={() => {
              unsaved.forEach((w) => saveToVocab(w, mode.source));
              toast.success(`틀린 단어 ${unsaved.length}개를 단어장에 넣었어요.`);
            }}
          >
            <Plus aria-hidden="true" />
            틀린 단어 {unsaved.length}개 단어장에 넣기
          </Button>
        ) : null}
        {rightToDone.length > 0 ? (
          <Button
            onClick={() => {
              rightToDone.forEach((w) => w.id && setVocabStatus(w.id, "done"));
              toast.success(`맞힌 단어 ${rightToDone.length}개를 ‘다 외웠어요’로 표시했어요.`);
            }}
          >
            <Check aria-hidden="true" />
            맞힌 단어 {rightToDone.length}개 ‘다 외웠어요’
          </Button>
        ) : null}
        {wrongToLearn.length > 0 ? (
          <Button
            variant="outline"
            onClick={() => {
              wrongToLearn.forEach((w) => w.id && setVocabStatus(w.id, "learning"));
              toast.success(`틀린 단어 ${wrongToLearn.length}개를 ‘외우는 중’으로 바꿨어요.`);
            }}
          >
            <RotateCcw aria-hidden="true" />
            틀린 단어 {wrongToLearn.length}개 다시 외우기
          </Button>
        ) : null}
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          다시 풀기
        </Button>
        <Button variant="ghost" onClick={onExit}>
          닫기
        </Button>
      </div>
    </div>
  );
}
