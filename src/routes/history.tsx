import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { WordQuizDialog } from "@/components/convert/WordQuiz";
import { ConfirmDelete } from "@/components/site/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { plainEasy } from "@/lib/easy-markup";
import { levelLabel } from "@/lib/levels";
import { canMakeQuiz } from "@/lib/quiz";
import {
  historyStore,
  removeHistory,
  removeVocab,
  setVocabStatus,
  useCollection,
  vocabStore,
  type VocabItem,
} from "@/lib/storage";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "내 기록 — 풀어읽기" },
      {
        name: "description",
        content: "지난 변환 기록을 다시 보고, 단어장에 모은 어려운 단어를 외워 보세요.",
      },
      { property: "og:title", content: "내 기록 — 풀어읽기" },
      { property: "og:description", content: "변환 기록과 내 단어장을 한곳에서 확인해요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const history = useCollection(historyStore);
  const vocab = useCollection(vocabStore);

  return (
    <div className="container-page max-w-[56rem] py-10 md:py-14">
      <h1 className="text-[2rem] md:text-[2.5rem]">내 기록</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        기록과 단어장은 지금 쓰는 이 기기에만 저장돼요.
      </p>

      <Tabs defaultValue="records" className="mt-6">
        <TabsList className="h-auto rounded-full bg-primary-soft p-1">
          <TabsTrigger
            value="records"
            className="min-h-9 rounded-full px-4 text-[0.9375rem] data-[state=active]:bg-card data-[state=active]:shadow-xs"
          >
            변환 기록 <span className="sr-only">({history.length}개)</span>
          </TabsTrigger>
          <TabsTrigger
            value="vocab"
            className="min-h-9 rounded-full px-4 text-[0.9375rem] data-[state=active]:bg-card data-[state=active]:shadow-xs"
          >
            내 단어장 <span className="sr-only">({vocab.length}개)</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="records">
          <Records />
        </TabsContent>
        <TabsContent value="vocab">
          <Vocabulary items={vocab} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
      <p className="font-serif text-[1.25rem] font-bold">{title}</p>
      <p className="mt-2 text-muted-foreground">{body}</p>
      <Button asChild size="sm" className="mt-6">
        <Link to="/convert">글 바꾸러 가기</Link>
      </Button>
    </div>
  );
}

function Records() {
  const history = useCollection(historyStore);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return history;
    return history.filter(
      (h) => h.title.includes(q) || h.original.includes(q) || plainEasy(h.easyMarkup).includes(q),
    );
  }, [history, query]);

  if (history.length === 0) {
    return (
      <EmptyState title="아직 변환 기록이 없어요" body="글을 풀어 읽으면 여기에 차곡차곡 쌓여요." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="history-search" className="sr-only">
          변환 기록 검색
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="history-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="기록 검색"
          className="min-h-12 w-full rounded-full border border-input bg-card pr-4 pl-11 shadow-xs placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-3xl border bg-card p-6">‘{query}’(이)가 들어간 기록이 없어요.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((h) => {
            const firstLine =
              plainEasy(h.easyMarkup)
                .split("\n")
                .map((l) => l.trim())
                .find((l) => l.length > 12) ?? plainEasy(h.easyMarkup).slice(0, 80);
            // 첫 문장만 제목처럼 보여 줌
            const headline = firstLine.split(/(?<=[.!?])\s/)[0] ?? firstLine;
            return (
              <li
                key={h.id}
                className="relative flex items-start justify-between gap-4 rounded-3xl border bg-card p-5 shadow-xs transition-colors hover:bg-[#fffaf0] md:p-6"
              >
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    <time dateTime={h.createdAt}>
                      {format(new Date(h.createdAt), "yyyy. M. d. a h:mm", { locale: ko })}
                    </time>
                    {" · "}
                    {levelLabel(h.level)}
                  </p>
                  <h2 className="mt-1 font-sans text-[1.125rem] font-semibold">
                    {/* 카드 전체를 누르면 다시 보기 */}
                    <Link
                      to="/convert"
                      search={{ id: h.id }}
                      className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none"
                    >
                      {headline}
                      <span className="sr-only"> ({h.title} 다시 보기)</span>
                    </Link>
                  </h2>
                  <p className="mt-1 line-clamp-1 text-[0.9375rem] text-muted-foreground">
                    {h.original}
                  </p>
                </div>
                <div className="relative z-10">
                  <ConfirmDelete
                    textOnly
                    label={`${h.title} 기록 삭제`}
                    title="이 기록을 지울까요?"
                    description={`‘${h.title}’ 변환 기록을 지워요. 지운 기록은 되돌릴 수 없어요.`}
                    onConfirm={() => removeHistory(h.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type Filter = "all" | VocabItem["status"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "learning", label: "외우는 중" },
  { id: "done", label: "다 외웠어요" },
];

function Vocabulary({ items }: { items: VocabItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [quizOpen, setQuizOpen] = useState(false);

  if (items.length === 0) {
    return (
      <EmptyState
        title="단어장이 비어 있어요"
        body="변환 결과의 ‘어려운 단어 풀이’에서 ‘+ 단어장’을 누르면 여기에 모여요."
      />
    );
  }

  const count = (f: Filter) =>
    f === "all" ? items.length : items.filter((i) => i.status === f).length;
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  const quizWords = shown.map((v) => ({
    id: v.id,
    word: v.word,
    easy: v.easy,
    meaning: v.meaning,
    sentence: v.sentence,
  }));
  const quizReady = canMakeQuiz(quizWords);
  const filterName = FILTERS.find((f) => f.id === filter)?.label ?? "전체";

  return (
    <div className="space-y-4">
      <WordQuizDialog
        open={quizOpen}
        onOpenChange={setQuizOpen}
        title="내 단어장 퀴즈"
        words={quizWords}
        mode={{ kind: "vocab" }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="단어 거르기" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className="min-h-9 rounded-full border border-input bg-card px-3.5 text-sm font-medium shadow-xs hover:bg-secondary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {f.label}
              <span className="sr-only"> ({count(f.id)}개)</span>
            </button>
          ))}
        </div>
        <Button
          size="sm"
          disabled={!quizReady}
          onClick={() => setQuizOpen(true)}
          title={
            quizReady
              ? `지금 보이는 ‘${filterName}’ 단어 ${shown.length}개로 퀴즈를 풀어요.`
              : "퀴즈를 풀려면 단어가 2개 이상 필요해요."
          }
        >
          단어장 퀴즈
        </Button>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-3xl border bg-card p-6">
          {filter === "done"
            ? "아직 다 외운 단어가 없어요."
            : "외우는 중인 단어가 없어요. 모두 외웠어요!"}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((v) => {
            const done = v.status === "done";
            return (
              <li
                key={v.id}
                className="flex flex-col rounded-3xl border bg-card p-5 shadow-xs md:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[1.375rem]">
                    <span className={done ? undefined : "brand-mark"}>{v.word}</span>
                    <span className="sr-only">{done ? " (다 외웠어요)" : " (외우는 중)"}</span>
                  </h2>
                  <ConfirmDelete
                    textOnly
                    label={`${v.word} 단어 삭제`}
                    title="이 단어를 지울까요?"
                    description={`‘${v.word}’을(를) 단어장에서 지워요.`}
                    onConfirm={() => removeVocab(v.id)}
                  />
                </div>
                <p className="mt-2">
                  <span className="font-semibold">{v.easy}</span>
                  {v.meaning && v.meaning !== v.easy ? <> · {v.meaning}</> : null}
                </p>
                {v.sentence ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    나온 문장: {v.sentence}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">출처: {v.source}</p>

                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    onClick={() => setVocabStatus(v.id, done ? "learning" : "done")}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-input bg-card px-3.5 text-sm font-medium shadow-xs hover:bg-secondary"
                  >
                    {done ? "다시 외울래요" : "다 외웠어요 ✓"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
