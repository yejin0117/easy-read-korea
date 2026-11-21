import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BookOpen, CheckCircle2, Eye, RotateCcw, Search } from "lucide-react";
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
      { name: "description", content: "지난 변환 기록을 다시 보고, 단어장에 모은 어려운 단어를 외워 보세요." },
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
    <div className="container-page py-10 md:py-14">
      <h1 className="text-[2rem] md:text-[2.5rem]">내 기록</h1>
      <p className="mt-2">기록과 단어장은 지금 쓰는 이 기기에만 저장돼요.</p>

      <Tabs defaultValue="records" className="mt-8">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="records" className="flex-1 sm:flex-none">
            변환 기록 <span className="text-base">({history.length})</span>
          </TabsTrigger>
          <TabsTrigger value="vocab" className="flex-1 sm:flex-none">
            내 단어장 <span className="text-base">({vocab.length})</span>
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
    <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
      <p className="text-[1.25rem] font-bold">{title}</p>
      <p className="mt-2">{body}</p>
      <Button asChild className="mt-6">
        <Link to="/convert">풀어읽기 하러 가기</Link>
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
    return <EmptyState title="아직 변환 기록이 없어요" body="글을 풀어 읽으면 여기에 차곡차곡 쌓여요." />;
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <label htmlFor="history-search" className="sr-only">
          변환 기록 검색
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="history-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목이나 내용으로 찾기"
          className="min-h-12 w-full rounded-full border-2 border-input bg-card pr-4 pl-12 text-[1.125rem] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6">‘{query}’(이)가 들어간 기록이 없어요.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((h) => {
            const firstLine =
              plainEasy(h.easyMarkup)
                .split("\n")
                .map((l) => l.trim())
                .find((l) => l.length > 12) ?? plainEasy(h.easyMarkup).slice(0, 80);
            return (
              <li key={h.id} className="rounded-2xl border bg-card p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
                  <time dateTime={h.createdAt} className="text-muted-foreground">
                    {format(new Date(h.createdAt), "yyyy년 M월 d일 a h:mm", { locale: ko })}
                  </time>
                  <span className="rounded-full bg-primary-soft px-3 py-0.5 font-semibold text-primary">
                    {levelLabel(h.level)}
                  </span>
                </div>
                <h2 className="mt-2 text-[1.3125rem]">{h.title}</h2>
                <p className="mt-1 line-clamp-2">{firstLine}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/convert" search={{ id: h.id }}>
                      <Eye aria-hidden="true" />
                      다시 보기
                    </Link>
                  </Button>
                  <ConfirmDelete
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

  const count = (f: Filter) => (f === "all" ? items.length : items.filter((i) => i.status === f).length);
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold">단어장 퀴즈</p>
          <p className="text-base text-muted-foreground">
            {quizReady
              ? `지금 보이는 ‘${filterName}’ 단어 ${shown.length}개로 퀴즈를 풀어요.`
              : "퀴즈를 풀려면 단어가 2개 이상 필요해요."}
          </p>
        </div>
        <Button
          className="shrink-0 self-start sm:self-center"
          disabled={!quizReady}
          onClick={() => setQuizOpen(true)}
        >
          퀴즈 풀기
        </Button>
      </div>
      <WordQuizDialog
        open={quizOpen}
        onOpenChange={setQuizOpen}
        title="내 단어장 퀴즈"
        words={quizWords}
        mode={{ kind: "vocab" }}
      />

      <div role="group" aria-label="단어 거르기" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            variant="toggle"
            size="sm"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({count(f.id)})
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6">
          {filter === "done" ? "아직 다 외운 단어가 없어요." : "외우는 중인 단어가 없어요. 모두 외웠어요!"}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((v) => {
            const done = v.status === "done";
            return (
              <li key={v.id} className="flex flex-col rounded-2xl border bg-card p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base text-muted-foreground">원래 단어</p>
                    <h2 className="text-[1.5rem]">{v.word}</h2>
                  </div>
                  <span
                    className={
                      done
                        ? "inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-base font-semibold text-primary"
                        : "inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1 text-base font-semibold"
                    }
                  >
                    {done ? (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    ) : (
                      <BookOpen className="size-4" aria-hidden="true" />
                    )}
                    {done ? "다 외웠어요" : "외우는 중"}
                  </span>
                </div>

                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="text-base text-muted-foreground">쉬운 말</dt>
                    <dd className="text-[1.25rem] font-semibold">{v.easy}</dd>
                  </div>
                  <div>
                    <dt className="text-base text-muted-foreground">뜻</dt>
                    <dd>{v.meaning}</dd>
                  </div>
                  {v.sentence ? (
                    <div>
                      <dt className="text-base text-muted-foreground">나온 문장</dt>
                      <dd className="text-base">“{v.sentence}”</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-base text-muted-foreground">출처</dt>
                    <dd className="text-base">{v.source}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {done ? (
                    <Button variant="outline" size="sm" onClick={() => setVocabStatus(v.id, "learning")}>
                      <RotateCcw aria-hidden="true" />
                      다시 외우기
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setVocabStatus(v.id, "done")}>
                      <CheckCircle2 aria-hidden="true" />
                      다 외웠어요
                    </Button>
                  )}
                  <ConfirmDelete
                    iconOnly
                    label={`${v.word} 단어 삭제`}
                    title="이 단어를 지울까요?"
                    description={`‘${v.word}’을(를) 단어장에서 지워요.`}
                    onConfirm={() => removeVocab(v.id)}
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
