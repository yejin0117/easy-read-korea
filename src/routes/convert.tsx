import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ResultView } from "@/components/convert/ResultView";
import { Notice } from "@/components/site/Notice";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  buildAiResult,
  convertFallback,
  convertSample,
  type ConversionResult,
} from "@/lib/convert";
import { convertWithAI } from "@/lib/gemini";
import { LEVELS, type Level } from "@/lib/levels";
import { SAMPLES } from "@/lib/samples";
import { historyStore, saveHistory, useCollection } from "@/lib/storage";

const MAX_LENGTH = 5000;
const MIN_LENGTH = 10;

export const Route = createFileRoute("/convert")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "변환하기 — 풀어읽기" },
      {
        name: "description",
        content:
          "어려운 글을 붙여 넣고 수준을 고르면 핵심 3줄 요약, 쉬운 글, 단어 풀이를 보여 드려요.",
      },
      { property: "og:title", content: "변환하기 — 풀어읽기" },
      {
        property: "og:description",
        content: "어려운 글을 붙여 넣고 수준을 고르면 쉬운 말로 풀어 드려요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConvertPage,
});

function ConvertPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/convert" });
  const history = useCollection(historyStore);

  const [text, setText] = useState("");
  const [level, setLevel] = useState<Level>("middle");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 내 기록의 '다시 보기'로 들어온 경우
  useEffect(() => {
    if (!id) return;
    const found = history.find((h) => h.id === id);
    if (found && result?.id !== found.id) {
      setResult(found);
      setText(found.original);
      setLevel(found.level);
    }
  }, [id, history, result?.id]);

  useEffect(() => {
    if (result && !loading) {
      window.scrollTo({ top: 0 });
      resultHeading.current?.focus({ preventScroll: true });
    }
  }, [result, loading]);

  function handleConvert() {
    if (text.trim().length < MIN_LENGTH) {
      setError(`풀어 읽을 글을 ${MIN_LENGTH}자 이상 넣어 주세요.`);
      textareaRef.current?.focus();
      return;
    }
    setError(null);
    setLoading(true);
    void runConvert(text, level);
  }

  async function runConvert(source: string, chosen: Level) {
    // 예시 글은 미리 만든 결과를 바로 보여 줌 (시연용, API 사용 안 함)
    let next = convertSample(source, chosen);
    if (!next) {
      try {
        const res = await convertWithAI({ data: { text: source, level: chosen } });
        next = res.ok
          ? buildAiResult(source, chosen, res.output)
          : convertFallback(source, chosen, res.reason);
      } catch (e) {
        console.error(e);
        next = convertFallback(source, chosen, "failed");
      }
    }
    saveHistory(next);
    setResult(next);
    setLoading(false);
    void navigate({ search: { id: next.id }, replace: true });
  }

  function backToInput() {
    setResult(null);
    void navigate({ search: {}, replace: true });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  const showResult = result !== null && !loading;

  return (
    <div className="container-page max-w-[56rem] py-10 md:py-14">
      {showResult ? (
        <>
          <Button variant="outline" size="sm" onClick={backToInput}>
            <ArrowLeft aria-hidden="true" />
            다시 입력
          </Button>
          <ResultView ref={resultHeading} result={result} />
        </>
      ) : (
        <>
          <h1 className="text-[2rem] md:text-[2.5rem]">
            어떤 글을 <span className="brand-mark">쉽게</span> 바꿀까요?
          </h1>

          <div className="mt-6">
            <label htmlFor="source-text" className="sr-only">
              어려운 글 넣기
            </label>
            <div className="relative">
              <Textarea
                id="source-text"
                ref={textareaRef}
                value={text}
                maxLength={MAX_LENGTH}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="어려운 글을 여기에 붙여넣으세요."
                className="min-h-60 rounded-3xl border-border bg-card p-5 text-[1.0625rem] shadow-xs"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "text-error privacy-note" : "privacy-note"}
              />
              {text ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  aria-label="입력한 글 모두 지우기"
                  onClick={() => {
                    setText("");
                    textareaRef.current?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
              <p id="privacy-note">
                이름, 주민등록번호, 주소, 전화번호, 계좌번호는 지우고 넣어 주세요.
              </p>
              <p aria-live="polite">
                {text.length.toLocaleString("ko-KR")} / {MAX_LENGTH.toLocaleString("ko-KR")}자
              </p>
            </div>
            {error ? (
              <div id="text-error" className="mt-3">
                <Notice tone="warning" title="글을 넣어 주세요">
                  {error}
                </Notice>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="text-[0.9375rem] text-muted-foreground">예시 글</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setText(s.original);
                    setError(null);
                  }}
                  className="min-h-9 rounded-full border border-input bg-card px-3.5 text-sm font-medium shadow-xs transition-colors hover:bg-secondary"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="text-[0.9375rem] text-muted-foreground">읽을 사람</legend>
            <div
              role="radiogroup"
              aria-label="읽는 사람 수준"
              className="mt-2 grid gap-2 sm:grid-cols-3"
            >
              {LEVELS.map((l) => {
                const selected = level === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={l.hint}
                    onClick={() => setLevel(l.id)}
                    className={
                      selected
                        ? "min-h-14 rounded-2xl border-2 border-primary bg-highlight px-4 font-bold"
                        : "min-h-14 rounded-2xl border-2 border-border bg-card px-4 font-bold hover:bg-secondary"
                    }
                  >
                    {l.label}
                    <span className="sr-only"> ({l.hint})</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Button
            size="lg"
            className="mt-6 w-full disabled:bg-[#9a9084] disabled:opacity-100"
            onClick={handleConvert}
            disabled={loading || text.trim().length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                쉬운 글로 바꾸는 중…
              </>
            ) : (
              "변환하기"
            )}
          </Button>
          {loading ? (
            <p className="mt-3 text-center text-sm text-muted-foreground" aria-live="polite">
              AI가 문장을 새로 쓰고 있어요. 10~20초쯤 걸릴 수 있어요.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
