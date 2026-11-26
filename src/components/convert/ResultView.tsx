import { BookmarkCheck, Plus } from "lucide-react";
import { forwardRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Notice } from "@/components/site/Notice";
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
        <div className="mt-1 text-sm text-muted-foreground">
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
        <div className="mt-1 text-sm text-muted-foreground">
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
        <p className="mt-1 text-sm text-muted-foreground">AI 풀이 (사전에서 찾지 못한 단어)</p>
      ) : null}
    </>
  );
}

function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-xs md:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[1.25rem]">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

export const ResultView = forwardRef<HTMLHeadingElement, { result: ConversionResult }>(
  function ResultView({ result }, headingRef) {
    const [showOriginal, setShowOriginal] = useState(false);
    const vocab = useCollection(vocabStore);
    const check = checkNumbers(result.original, plainEasy(result.easyMarkup), result.summary);
    const changed = countChanged(result.easyMarkup);

    return (
      <section aria-labelledby="result-title" className="mt-6 space-y-4">
        <div>
          <h2 id="result-title" ref={headingRef} tabIndex={-1} className="sr-only outline-none">
            변환 결과
          </h2>
          <p className="text-sm text-muted-foreground">
            {levelLabel(result.level)} 수준 · {result.title}
            {result.kind === "ai"
              ? " · AI(Google Gemini)가 바꾼 결과예요. 중요한 내용은 원문과 함께 확인해 주세요."
              : result.kind === "sample"
                ? " · 미리 만들어 둔 예시 결과예요."
                : ""}
          </p>
        </div>

        {result.kind === "custom" ? (
          <Notice tone="warning" title="AI 연결에 실패해서 간단히 바꾼 결과예요">
            {FALLBACK_MESSAGE[result.fallbackReason ?? "failed"]} 지금은 사전에 있는 어려운 단어만
            바꿨고, 문장은 그대로일 수 있어요.
          </Notice>
        ) : null}

        {/* 1. 핵심 3줄 요약 */}
        <Card title="핵심 3줄 요약">
          {result.summary.length > 0 ? (
            <ol className="mt-3 space-y-1.5">
              {result.summary.map((line, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-4 shrink-0 font-semibold" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3">요약할 문장을 찾지 못했어요.</p>
          )}
        </Card>

        {/* 2. 쉬운 글 (+ 원문 좌우 비교) */}
        <Card
          title="쉬운 글"
          aside={
            changed > 0 ? (
              <p className="text-sm text-muted-foreground">바뀐 말 {changed}곳</p>
            ) : undefined
          }
        >
          <label className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
              aria-controls="original-panel"
              className="size-4 accent-[var(--color-primary)]"
            />
            원문 같이 보기
          </label>
          {changed > 0 ? (
            <p className="text-sm text-muted-foreground">
              <mark className="marker-highlight text-foreground">형광펜</mark> 말을 누르면 원래 말과
              뜻이 나와요.
            </p>
          ) : null}
          <div className={showOriginal ? "mt-4 grid gap-5 md:grid-cols-2" : "mt-4"}>
            <EasyText markup={result.easyMarkup} glossary={result.glossary} />
            {showOriginal ? (
              <div
                id="original-panel"
                className="rounded-2xl bg-secondary p-5 text-[0.9375rem] leading-[1.8] text-muted-foreground"
              >
                <p className="mb-2 text-sm font-semibold text-foreground">원문</p>
                <p className="whitespace-pre-line">{result.original}</p>
              </div>
            ) : null}
          </div>
        </Card>

        {/* 변환 오류 확인 */}
        <Card title="변환 오류 확인">
          {check.checked.length === 0 && check.added.length === 0 ? (
            <p className="mt-2 text-muted-foreground">
              이 글에는 숫자나 날짜가 없어서 따로 검사하지 않았어요.
            </p>
          ) : check.ok ? (
            <p className="mt-2 text-muted-foreground" role="status">
              원문의 숫자·날짜 {check.checked.length}개가 쉬운 글에 모두 그대로 있어요. 뜻까지
              맞는지는 원문과 함께 확인해 주세요.
            </p>
          ) : (
            <div className="mt-2" role="alert">
              <p className="font-semibold text-destructive">원문과 다른 숫자가 있어요</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {check.missing.length > 0 ? (
                  <li>
                    원문에 있는 숫자 <strong>{check.missing.map(formatNumber).join(", ")}</strong>
                    이(가) 쉬운 글에 없어요.
                  </li>
                ) : null}
                {check.added.length > 0 ? (
                  <li>
                    원문에 없던 숫자 <strong>{check.added.map(formatNumber).join(", ")}</strong>
                    이(가) 새로 생겼어요.
                  </li>
                ) : null}
              </ul>
              <p className="mt-2 text-muted-foreground">
                ‘원문 같이 보기’로 두 글을 꼭 비교해 보세요.
              </p>
            </div>
          )}
        </Card>

        {/* 3. 어려운 단어 퀴즈 (모달) */}
        <WordQuizCard key={result.id} words={result.glossary} source={result.title} />

        {/* 4. 어려운 단어 풀이 */}
        <Card title="어려운 단어 풀이">
          {result.glossary.length === 0 ? (
            <p className="mt-3">이 글에서는 풀이할 어려운 단어를 찾지 못했어요.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {result.glossary.map((g) => {
                const saved = vocab.some((v) => v.word === g.word && v.source === result.title);
                return (
                  <li
                    key={g.word}
                    className="flex items-start justify-between gap-4 py-4 first:pt-1 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[1.125rem]">
                        <span className="marker-highlight font-semibold">{g.word}</span>
                        <span aria-hidden="true" className="text-muted-foreground">
                          {" "}
                          →{" "}
                        </span>
                        <span className="sr-only">의 쉬운 말은 </span>
                        <span className="font-semibold">{g.easy}</span>
                      </p>
                      <GlossaryMeaning entry={g} />
                      {g.sentence ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          나온 문장: {g.sentence}
                        </p>
                      ) : null}
                    </div>
                    {saved ? (
                      <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-sm font-medium">
                        <BookmarkCheck className="size-4" aria-hidden="true" />
                        단어장에 있어요
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-input bg-card px-3 text-sm font-medium shadow-xs hover:bg-secondary"
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
                        <Plus className="size-4" aria-hidden="true" />
                        단어장
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    );
  },
);
