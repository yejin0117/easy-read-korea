import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Loader2, Sparkles, X } from "lucide-react";
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
      resultHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="text-[2rem] md:text-[2.5rem]">변환하기</h1>
      <p className="mt-2">어려운 글을 넣고, 읽을 사람의 수준을 골라 주세요.</p>

      <div className="mt-8 space-y-8 rounded-2xl border bg-card p-5 md:p-8">
        {/* 글 입력 */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label htmlFor="source-text" className="text-[1.25rem] font-bold">
              1. 어려운 글 넣기
            </label>
            <p className="text-base text-muted-foreground" aria-live="polite">
              {text.length.toLocaleString("ko-KR")} / {MAX_LENGTH.toLocaleString("ko-KR")}자
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold">예시 불러오기</span>
            {SAMPLES.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setText(s.original);
                  setError(null);
                }}
              >
                <FileText aria-hidden="true" />
                {s.label}
              </Button>
            ))}
          </div>

          <div className="relative mt-3">
            <Textarea
              id="source-text"
              ref={textareaRef}
              value={text}
              maxLength={MAX_LENGTH}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="여기에 공문, 계약서, 약 설명서 같은 글을 붙여 넣으세요."
              className="min-h-72"
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

          {error ? (
            <div id="text-error" className="mt-3">
              <Notice tone="warning" title="글을 넣어 주세요">
                {error}
              </Notice>
            </div>
          ) : null}

          <div id="privacy-note" className="mt-3">
            <Notice tone="warning" title="개인정보가 담긴 글은 넣지 마세요">
              이름, 주민등록번호, 주소, 전화번호, 계좌번호는 지우고 넣어 주세요.
            </Notice>
          </div>
        </div>

        {/* 수준 선택 */}
        <fieldset>
          <legend className="text-[1.25rem] font-bold">2. 누가 읽나요?</legend>
          <div
            role="radiogroup"
            aria-label="읽는 사람 수준"
            className="mt-3 grid gap-3 sm:grid-cols-3"
          >
            {LEVELS.map((l) => {
              const selected = level === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLevel(l.id)}
                  className={
                    selected
                      ? "flex min-h-11 flex-col items-start rounded-2xl border-2 border-primary bg-primary-soft px-5 py-4 text-left"
                      : "flex min-h-11 flex-col items-start rounded-2xl border-2 border-input bg-card px-5 py-4 text-left hover:border-primary"
                  }
                >
                  <span className="flex items-center gap-2 text-[1.1875rem] font-bold">
                    <span
                      aria-hidden="true"
                      className={
                        selected
                          ? "grid size-5 place-items-center rounded-full border-2 border-primary"
                          : "grid size-5 place-items-center rounded-full border-2 border-input"
                      }
                    >
                      {selected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                    </span>
                    {l.label}
                  </span>
                  <span className="mt-1 text-base text-muted-foreground">{l.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button size="xl" className="w-full" onClick={handleConvert} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              풀어 읽는 중…
            </>
          ) : (
            <>
              <Sparkles aria-hidden="true" />
              풀어읽기
            </>
          )}
        </Button>
      </div>

      {result && !loading ? <ResultView ref={resultHeading} result={result} /> : null}
    </div>
  );
}
