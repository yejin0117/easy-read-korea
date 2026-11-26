import { Link, createFileRoute } from "@tanstack/react-router";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "소개 — 풀어읽기" },
      {
        name: "description",
        content:
          "풀어읽기를 만든 이유, 작동 방식, 수준별 규칙, 이용 전 주의사항과 앞으로의 계획을 소개해요.",
      },
      { property: "og:title", content: "소개 — 풀어읽기" },
      {
        property: "og:description",
        content: "어려운 글 앞에서 멈추는 사람이 없도록, 풀어읽기를 소개해요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const AUDIENCE = [
  {
    title: "어르신",
    body: "작은 글씨와 한자어가 가득한 고지서, 안내문이 부담스러운 분",
  },
  {
    title: "어린이·청소년",
    body: "가정통신문이나 약 설명서를 스스로 읽어 보고 싶은 학생",
  },
  {
    title: "한국어 학습자",
    body: "일상 한국어는 되지만 행정·법률 용어가 낯선 분",
  },
  {
    title: "낯선 서류를 처음 만난 사람",
    body: "첫 계약, 첫 신고처럼 처음 보는 서류 앞에 선 누구나",
  },
];

const STEPS = [
  { title: "글 입력", body: "어려운 글을 붙여 넣고 읽을 사람의 수준을 골라요." },
  { title: "AI 변환", body: "AI가 수준별 규칙에 맞춰 문장과 단어를 쉽게 바꿔요." },
  {
    title: "변환 오류 확인",
    body: "원문과 쉬운 글의 숫자·날짜가 같은지 따로 검사해요.",
  },
  {
    title: "결과와 단어장",
    body: "요약, 쉬운 글, 단어 풀이를 보고 단어를 단어장에 모아요.",
  },
];

const RULES: { row: string; elementary: string; middle: string; learner: string }[] = [
  {
    row: "문장 길이",
    elementary: "한 문장 8어절 이하",
    middle: "한 문장 12어절 안팎",
    learner: "짧게(6~8어절), 한 문장에 한 가지",
  },
  {
    row: "어려운 단어",
    elementary: "모두 쉬운 우리말로 바꿔요",
    middle: "꼭 필요한 용어만 남기고 나머지는 쉬운 말로 바꿔요",
    learner: "국립국어원 초급 어휘 위주로 써요",
  },
  {
    row: "문장 끝",
    elementary: "‘-해요’ 말투",
    middle: "‘-해요’ 말투",
    learner: "‘-해요’ 말투, 같은 꼴로 반복",
  },
  {
    row: "꾸미는 말·관용어",
    elementary: "거의 쓰지 않아요",
    middle: "꼭 필요할 때만",
    learner: "쓰지 않아요",
  },
  {
    row: "숫자·날짜",
    elementary: "원문 그대로",
    middle: "원문 그대로",
    learner: "원문 그대로",
  },
];

const CAUTIONS = [
  {
    title: "AI는 틀릴 수 있어요",
    body: "바뀐 글이 원문의 뜻과 다를 수 있어요. 중요한 내용은 꼭 원문과 비교해 주세요.",
  },
  {
    title: "오류 확인은 숫자·날짜만 검사해요",
    body: "문장의 뜻이 맞는지, 빠진 조건이 없는지까지는 검사하지 않아요.",
  },
  {
    title: "단어 뜻풀이는 국립국어원 우리말샘에서 가져와요",
    body: "어려운 단어 풀이의 사전 뜻은 국립국어원 우리말샘(CC BY-SA 2.0 KR)의 뜻풀이를 그대로 보여 줘요. AI는 문장에 맞는 뜻을 고르기만 해요. 사전에서 찾지 못한 단어는 ‘AI 풀이’로 따로 표시해요.",
  },
  {
    title: "개인정보는 넣지 마세요",
    body: "이름, 주민등록번호, 주소, 전화번호, 계좌번호는 지우고 넣어 주세요.",
  },
  {
    title: "법률·의료 상담을 대신하지 않아요",
    body: "계약, 소송, 약 복용처럼 중요한 결정은 변호사, 의사, 약사 같은 전문가와 상의하세요.",
  },
];

const PLANS = [
  {
    title: "자체 난이도 판별 모델",
    body: "글이 얼마나 어려운지 먼저 재고, 어디가 어려운지 짚어 줘요.",
  },
  {
    title: "자체 변환 모델",
    body: "공공·법률·의료 글에 맞춰 직접 학습한 모델로 더 정확하게 바꿔요.",
  },
  { title: "시선 추적", body: "읽다가 오래 머무는 곳을 알아채 그 부분을 더 쉽게 풀어 줘요." },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t py-8">
      <h2 id={id} className="text-[1.375rem] md:text-[1.5rem]">
        {title}
      </h2>
      <div className="mt-3 text-muted-foreground">{children}</div>
    </section>
  );
}

function AboutPage() {
  return (
    <div className="container-page max-w-[44rem] py-10 md:py-14">
      <h1 className="pb-8 text-[2rem] md:text-[2.5rem]">
        <span className="brand-mark">풀어읽기</span>를 소개해요
      </h1>

      <Section id="why" title="만든 이유">
        <div className="space-y-3">
          <p>
            주민센터 안내문, 집 계약서, 약 설명서는 우리 생활에 꼭 필요한 글이에요. 그런데 이런
            글일수록 ‘의거하여’, ‘임차인’, ‘복용’ 같은 어려운 말이 가득해요.
          </p>
          <p>
            뜻을 몰라 중요한 날짜를 놓치거나, 잘못 이해해서 손해를 보는 일이 없도록, 읽는 사람의
            눈높이에 맞춰 글을 풀어 주는 서비스를 만들었어요.
          </p>
        </div>
      </Section>

      <Section id="who" title="누구를 위한 서비스인가요">
        <ul className="space-y-2">
          {AUDIENCE.map((a) => (
            <li key={a.title}>
              <span className="font-semibold text-foreground">{a.title}</span> — {a.body}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="how" title="작동 방식">
        <ol className="list-decimal space-y-1.5 pl-5">
          {STEPS.map((s) => (
            <li key={s.title}>
              <span className="font-semibold text-foreground">{s.title}</span>: {s.body}
            </li>
          ))}
        </ol>
      </Section>

      <Section id="rules" title="수준별 규칙 비교">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-[0.9375rem]">
            <caption className="sr-only">초등학생, 중학생, 한국어 학습자 수준별 변환 규칙</caption>
            <thead>
              <tr className="border-b text-foreground">
                <th scope="col" className="py-2.5 pr-3 font-bold">
                  항목
                </th>
                <th scope="col" className="py-2.5 pr-3 font-bold">
                  초등학생
                </th>
                <th scope="col" className="py-2.5 pr-3 font-bold">
                  중학생
                </th>
                <th scope="col" className="py-2.5 font-bold">
                  한국어 학습자
                </th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.row} className="border-b">
                  <th scope="row" className="py-2.5 pr-3 align-top font-semibold text-foreground">
                    {r.row}
                  </th>
                  <td className="py-2.5 pr-3 align-top">{r.elementary}</td>
                  <td className="py-2.5 pr-3 align-top">{r.middle}</td>
                  <td className="py-2.5 align-top">{r.learner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="cautions" title="주의사항">
        <ul className="space-y-2.5">
          {CAUTIONS.map((c) => (
            <li key={c.title}>
              <span className="font-semibold text-foreground">
                <span className="sr-only">주의: </span>
                {c.title}.
              </span>{" "}
              {c.body}
            </li>
          ))}
          <li>
            <span className="font-semibold text-foreground">기록은 이 기기에만 있어요.</span> 변환
            기록과 단어장은 지금 쓰는 브라우저에만 저장돼요.
          </li>
        </ul>
      </Section>

      <Section id="plans" title="앞으로의 계획">
        <ul className="space-y-1.5">
          {PLANS.map((p) => (
            <li key={p.title}>
              <span className="font-semibold text-foreground">{p.title}</span> — {p.body}
            </li>
          ))}
        </ul>
      </Section>

      <div className="border-t pt-10 text-center">
        <Button asChild size="lg" className="px-10">
          <Link to="/convert">글 바꾸러 가기</Link>
        </Button>
      </div>
    </div>
  );
}
