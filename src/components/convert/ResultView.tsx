import { BookmarkCheck, Columns2, Plus } from "lucide-react";
import { forwardRef, useState } from "react";
import { toast } from "sonner";

import { Notice } from "@/components/site/Notice";
import { Button } from "@/components/ui/button";
import type { ConversionResult, GlossaryItem } from "@/lib/convert";
import { OPENDICT_CREDIT, OPENDICT_LICENSE } from "@/lib/dictionary";
import { countChanged, plainEasy } from "@/lib/easy-markup";
import { levelLabel } from "@/lib/levels";
import { checkNumbers } from "@/lib/number-check";
import { addVocab, useCollection, vocabStore } from "@/lib/storage";

import { EasyText } from "./EasyText";
import { WordQuizCard } from "./WordQuiz";

const FALLBACK_MESSAGE = {
  "no-key": "AI 키가 아직 설정되지 않았어요.",
  "too-many": "지금 AI 사용량이 많아요. 잠시 후 다시 시도해 주세요.",
  failed: "AI가 잠시 응답하지 않았어요. 잠시 후 다시 시도해 주세요.",
} as const;

function formatNumber(n: string) {
  const num = Number(n);
  return Number.isFinite(num) && n.length > 3 ? num.toLocaleString("ko-KR") : n;
}

function DictCredit({ edited }: { edited: boolean }) {
  return (
    <p>
      출처:{" "}
      <a
        href="https://opendict.korean.go.kr"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {OPENDICT_CREDIT}
      </a>{" "}
      ({OPENDICT_LICENSE}
      {edited ? ", 쉬운 말로 고쳐 씀" : ""})
    </p>
  );
}

/** 단어 풀이의 뜻: 사전 뜻이 있으면 사전 원문을, 없으면 AI 풀이를 보여 줍니다. */
function GlossaryMeaning({ entry: g }: { entry: GlossaryItem }) {
  const dict = g.dictMeanings ?? [];
  if (g.source === "dict" && dict.length > 0) {
    return (
      <div className="mt-1">
        {dict.length === 1 ? (
          <p>사전 뜻: {dict[0]?.definition}</p>
        ) : (
          <>
            <p>사전 뜻</p>
            <ul className="mt-0.5 space-y-0.5">
              {dict.map((d) => (
                <li key={d.headword}>
                  · <span className="font-semibold">{d.headword}</span>: {d.definition}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-1 text-base text-muted-foreground">
          <DictCredit edited={false} />
        </div>
      </div>
    );
  }

  // 예전 기록: 쉬운 뜻풀이 + 사전 뜻 한 줄
  if (g.source === "dict" && g.dictDefinition) {
    const edited = g.dictDefinition !== g.meaning;
    return (
      <>
        <p className="mt-1">{g.meaning}</p>
        <div className="mt-1 text-base text-muted-foreground">
          {edited ? <p>사전 뜻: {g.dictDefinition}</p> : null}
          <DictCredit edited={edited} />
        </div>
      </>
    );
  }

  return (
    <>
      <p className="mt-1">{g.meaning}</p>
      {g.source === "ai" ? (
        <p className="mt-1 text-base text-muted-foreground">AI 풀이 (사전에서 찾지 못한 단어)</p>
      ) : null}
    </>
  );
}

export const ResultView = forwardRef<HTMLHeadingElement, { result: ConversionResult }>(
  function ResultView({ result }, headingRef) {
    const [showOriginal, setShowOriginal] = useState(false);
    const vocab = useCollection(vocabStore);
    const check = checkNumbers(result.original, plainEasy(result.easyMarkup), result.summary);
    const changed = countChanged(result.easyMarkup);

    return (
      <section aria-labelledby="result-title" className="mt-14 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-base text-muted-foreground">
              {levelLabel(result.level)} 수준 · {result.title}
            </p>
            <h2
              id="result-title"
              ref={headingRef}
              tabIndex={-1}
              className="scroll-mt-40 text-[1.75rem] outline-none"
            >
              풀어읽기 결과
            </h2>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowOriginal((v) => !v)}
            aria-expanded={showOriginal}
            aria-controls="original-panel"
          >
            <Columns2 aria-hidden="true" />
            {showOriginal ? "원문 접기" : "원문 같이 보기"}
          </Button>
        </div>

        {result.kind === "ai" ? (
          <Notice tone="info" title="AI(Google Gemini)가 바꾼 결과예요">
            AI는 틀릴 수 있어요. 계약, 약 복용처럼 중요한 내용은 ‘원문 같이 보기’로 꼭 함께 확인해
            주세요.
          </Notice>
        ) : result.kind === "sample" ? (
          <Notice tone="info" title="예시 결과예요">
            예시 글은 미리 만들어 둔 결과를 보여 드려요. 직접 넣은 글은 AI가 바꿔 드려요.
          </Notice>
        ) : (
          <Notice tone="warning" title="AI 연결에 실패해서 간단히 바꾼 결과예요">
            {FALLBACK_MESSAGE[result.fallbackReason ?? "failed"]} 지금은 사전에 있는 어려운 단어만
            바꿨고, 문장은 그대로일 수 있어요.
          </Notice>
        )}

        {/* 1. 핵심 3줄 요약 */}
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <h3 className="text-[1.375rem]">핵심 3줄 요약</h3>
          {result.summary.length > 0 ? (
            <ol className="mt-4 space-y-3">
              {result.summary.map((line, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[1.1875rem]">{line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3">요약할 문장을 찾지 못했어요.</p>
          )}
        </div>

        {/* 2. 쉬운 글 (+ 원문 좌우 비교) */}
        <div className={showOriginal ? "grid gap-6 md:grid-cols-2" : "grid gap-6"}>
          {showOriginal ? (
            <div id="original-panel" className="rounded-2xl border bg-secondary p-6 md:p-8">
              <h3 className="text-[1.375rem]">원문</h3>
              <p className="mt-4 whitespace-pre-line">{result.original}</p>
            </div>
          ) : null}
          <div className="rounded-2xl border bg-card p-6 md:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[1.375rem]">쉬운 글</h3>
              {changed > 0 ? (
                <p className="text-base text-muted-foreground">바뀐 말 {changed}곳</p>
              ) : null}
            </div>
            {changed > 0 ? (
              <p className="mt-1 text-base text-muted-foreground">
                <mark className="marker-highlight text-foreground">형광펜</mark> 표시된 말에
                마우스를 올리거나 눌러 보세요. 원래 단어와 뜻이 나와요.
              </p>
            ) : null}
            <div className="mt-5">
              <EasyText markup={result.easyMarkup} glossary={result.glossary} />
            </div>
          </div>
        </div>

        {/* 변환 오류 확인 */}
        {check.checked.length === 0 && check.added.length === 0 ? (
          <Notice tone="info" title="변환 오류 확인: 검사할 숫자·날짜가 없어요">
            이 글에는 숫자나 날짜가 없어서 따로 검사하지 않았어요.
          </Notice>
        ) : check.ok ? (
          <Notice tone="success" title="변환 오류 확인: 숫자·날짜가 원문과 같아요">
            원문의 숫자·날짜 {check.checked.length}개가 쉬운 글에 모두 그대로 있어요. 뜻까지
            맞는지는 원문과 함께 확인해 주세요.
          </Notice>
        ) : (
          <Notice tone="warning" title="변환 오류 확인: 원문과 다른 숫자가 있어요">
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {check.missing.length > 0 ? (
                <li>
                  원문에 있는 숫자 <strong>{check.missing.map(formatNumber).join(", ")}</strong>
                  이(가) 쉬운 글에 없어요.
                </li>
              ) : null}
              {check.added.length > 0 ? (
                <li>
                  원문에 없던 숫자 <strong>{check.added.map(formatNumber).join(", ")}</strong>이(가)
                  새로 생겼어요.
                </li>
              ) : null}
            </ul>
            <p className="mt-2">‘원문 같이 보기’로 두 글을 꼭 비교해 보세요.</p>
          </Notice>
        )}

        {/* 3. 어려운 단어 퀴즈 (모달) */}
        <WordQuizCard key={result.id} words={result.glossary} source={result.title} />

        {/* 4. 어려운 단어 풀이 */}
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <h3 className="text-[1.375rem]">어려운 단어 풀이</h3>
          {result.glossary.length === 0 ? (
            <p className="mt-3">이 글에서는 풀이할 어려운 단어를 찾지 못했어요.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {result.glossary.map((g) => {
                const saved = vocab.some((v) => v.word === g.word && v.source === result.title);
                return (
                  <li
                    key={g.word}
                    className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-[1.25rem]">
                        <span className="font-bold">{g.word}</span>
                        <span aria-hidden="true"> → </span>
                        <span className="sr-only">의 쉬운 말은 </span>
                        <span className="font-semibold text-primary">{g.easy}</span>
                      </p>
                      <GlossaryMeaning entry={g} />
                      {g.sentence ? (
                        <p className="mt-1 text-base text-muted-foreground">
                          나온 문장: “{g.sentence}”
                        </p>
                      ) : null}
                    </div>
                    {saved ? (
                      <span className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full bg-primary-soft px-4 text-base font-semibold text-primary">
                        <BookmarkCheck className="size-5" aria-hidden="true" />
                        단어장에 있어요
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 self-start"
                        aria-label={`${g.word}을(를) 단어장에 넣기`}
                        onClick={() => {
                          addVocab({
                            word: g.word,
                            easy: g.easy,
                            meaning: g.meaning,
                            sentence: g.sentence,
                            source: result.title,
                          });
                          toast.success(`‘${g.word}’을(를) 단어장에 넣었어요.`);
                        }}
                      >
                        <Plus aria-hidden="true" />
                        단어장
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    );
  },
);
