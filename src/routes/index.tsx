import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ListOrdered, ShieldCheck, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "풀어읽기 — 어려운 글, 이제 풀어서 읽어요" },
      {
        name: "description",
        content: "공문, 계약서, 약 설명서를 읽는 사람 수준에 맞춰 쉬운 말로 바꿔 드려요. 핵심 3줄 요약과 단어 풀이까지.",
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

const FEATURES = [
  {
    icon: ListOrdered,
    title: "핵심 3줄 요약",
    body: "긴 글에서 꼭 알아야 할 내용만 세 줄로 먼저 보여 드려요.",
  },
  {
    icon: UsersRound,
    title: "읽는 사람에 맞춰",
    body: "초등학생, 중학생, 한국어 학습자 중 고르면 그 수준의 말로 바꿔요.",
  },
  {
    icon: ShieldCheck,
    title: "변환 오류 확인",
    body: "바꾸는 동안 숫자나 날짜가 빠지거나 바뀌지 않았는지 따로 검사해요.",
  },
];

function HomePage() {
  return (
    <div className="container-page">
      <section className="mx-auto flex max-w-3xl flex-col items-center pt-16 pb-14 text-center md:pt-24">
        <h1 className="text-[2.25rem] leading-tight md:text-[3.25rem]">
          어려운 글,
          <br />
          이제 풀어서 읽어요
        </h1>
        <p className="mt-5 max-w-2xl text-[1.25rem]">
          공문, 계약서, 약 설명서를 넣으면 읽는 사람에게 맞는 쉬운 말로 바꿔 드려요.
        </p>
        <Button asChild size="xl" className="mt-10">
          <Link to="/convert">
            풀어읽기 시작하기
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>

        <div className="mt-12 w-full rounded-2xl border bg-card p-5 text-left md:p-6">
          <p className="text-base text-muted-foreground">이렇게 바뀌어요</p>
          <p className="mt-2">
            <span className="font-semibold">원래 글 · </span>
            임차인은 잔금을 지급하여야 한다.
          </p>
          <p className="mt-1 text-[1.25rem]">
            <span className="text-base font-semibold">쉬운 글 · </span>
            <mark className="marker-highlight text-foreground">세입자</mark>는{" "}
            <mark className="marker-highlight text-foreground">남은 돈</mark>을 내야 해요.
          </p>
        </div>
      </section>

      <section aria-labelledby="features-title" className="pb-8">
        <h2 id="features-title" className="sr-only">
          주요 기능
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border bg-card p-6">
              <f.icon className="size-8 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-[1.3125rem]">{f.title}</h3>
              <p className="mt-2">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
