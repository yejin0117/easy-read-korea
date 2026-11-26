import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "풀어읽기 — 어려운 글, 이제 풀어서 읽어요" },
      {
        name: "description",
        content:
          "공문, 계약서, 약 설명서를 읽는 사람 수준에 맞춰 쉬운 말로 바꿔 드려요. 핵심 3줄 요약과 단어 풀이까지.",
      },
      { property: "og:title", content: "풀어읽기 — 어려운 글, 이제 풀어서 읽어요" },
      {
        property: "og:description",
        content: "공문, 계약서, 약 설명서를 읽는 사람 수준에 맞춰 쉬운 말로 바꿔 드려요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="container-page">
      <section className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground">EASY READ</p>
        <h1 className="mt-4 text-[3.75rem] leading-none font-black md:text-[5.5rem]">
          <span className="brand-mark">풀어읽기</span>
        </h1>
        <p className="mt-6 text-[1.125rem] text-muted-foreground md:text-[1.25rem]">
          어려운 글을, 읽는 사람 눈높이에 맞는 쉬운 글로.
        </p>
        <Button asChild size="lg" className="mt-10 px-10">
          <Link to="/convert">시작하기</Link>
        </Button>
      </section>
    </div>
  );
}
