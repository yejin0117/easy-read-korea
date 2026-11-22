import { describe, expect, it } from "vitest";

import {
  findSenses,
  lookupQueries,
  normalizeHeadword,
  parseOpendict,
  readPayload,
} from "./dictionary";
import { buildPickInput, mergeMeanings, parsePicks, splitBase } from "./word-meanings";

const payload = {
  channel: {
    total: 3,
    item: [
      {
        word: "세대",
        sense: [
          {
            definition: "같은 시대에 살면서 공통의 의식을 가지는 비슷한 연령층의 사람 전체.",
            pos: "명사",
            type: "일반어",
          },
          { definition: "<FL>현주소</FL>에 함께 사는 사람의 집단.", pos: "명사", type: "일반어" },
        ],
      },
      { word: "세대", sense: { definition: "방언 뜻", pos: "명사", type: "방언" } },
      { word: "세대-교체", sense: [{ definition: "다른 말", type: "일반어" }] },
    ],
  },
};

describe("우리말샘 응답 정리", () => {
  it("같은 표제어의 뜻만 모으고 방언·태그는 뺀다", () => {
    const senses = parseOpendict(payload, "세대");
    expect(senses.map((s) => s.definition)).toEqual([
      "같은 시대에 살면서 공통의 의식을 가지는 비슷한 연령층의 사람 전체.",
      "현주소에 함께 사는 사람의 집단.",
    ]);
  });

  it("표제어의 ^, - 표시를 무시하고 비교한다", () => {
    expect(normalizeHeadword("공동^주택")).toBe("공동주택");
    expect(normalizeHeadword("세대-교체")).toBe("세대교체");
  });

  it("기본형 → 원문 글자 → '-하다'를 뗀 말 순서로 찾는다", () => {
    expect(lookupQueries("자제하여", "자제하다")).toEqual(["자제하다", "자제하여", "자제"]);
  });

  it("API 오류나 네트워크 오류면 빈 결과", async () => {
    const errorFetch = async () =>
      new Response(JSON.stringify({ error: { error_code: "020", message: "bad key" } }));
    expect(await findSenses("세대", undefined, "k", errorFetch)).toEqual([]);
    const throwing = async () => {
      throw new Error("offline");
    };
    expect(await findSenses("세대", undefined, "k", throwing)).toEqual([]);
  });

  it("사전 뜻을 찾으면 첫 결과를 돌려준다", async () => {
    const ok = async () => new Response(JSON.stringify(payload));
    expect(await findSenses("세대", undefined, "k", ok)).toHaveLength(2);
  });
});

describe("뜻 고르기 합치기", () => {
  const senses = parseOpendict(payload, "세대");
  const entry = { word: "세대", easy: "집", meaning: "AI가 쓴 뜻" };
  const one = (picks: Map<string, number>) =>
    mergeMeanings(
      [{ entry, parts: [{ id: "1-1", headword: "세대", senses }], sentence: "" }],
      picks,
    );

  it("고른 번호의 사전 뜻 원문을 그대로 쓴다", () => {
    const [g] = one(new Map([["1-1", 2]]));
    expect(g).toMatchObject({
      meaning: "현주소에 함께 사는 사람의 집단.",
      dictMeanings: [{ headword: "세대", definition: "현주소에 함께 사는 사람의 집단." }],
      source: "dict",
    });
  });

  it("맞는 뜻이 없으면(0) AI 풀이를 그대로 둔다", () => {
    expect(one(new Map([["1-1", 0]]))[0]).toMatchObject({ meaning: "AI가 쓴 뜻", source: "ai" });
  });

  it("고르기에 실패했고 뜻이 여러 개면 AI 풀이", () => {
    expect(one(new Map())[0]?.source).toBe("ai");
  });

  it("뜻이 하나뿐이면 고르지 않아도 사전 뜻", () => {
    const [g] = mergeMeanings(
      [
        {
          entry,
          parts: [{ id: "1-1", headword: "가산세", senses: [{ definition: "더 내는 세금." }] }],
          sentence: "",
        },
      ],
      new Map(),
    );
    expect(g?.source).toBe("dict");
  });

  it("여러 단어 표현은 단어마다 사전 뜻을 모은다", () => {
    const phrase = { word: "부득이한 사유", easy: "어쩔 수 없는 사정", meaning: "AI 뜻" };
    const parts = [
      { id: "1-1", headword: "부득이하다", senses: [{ definition: "마지못하여 하는 수 없다." }] },
      {
        id: "1-2",
        headword: "사유",
        senses: [{ definition: "개인이 가짐." }, { definition: "일의 까닭." }],
      },
    ];
    const [g] = mergeMeanings([{ entry: phrase, parts, sentence: "" }], new Map([["1-2", 2]]));
    expect(g).toMatchObject({
      source: "dict",
      dictMeanings: [
        { headword: "부득이하다", definition: "마지못하여 하는 수 없다." },
        { headword: "사유", definition: "일의 까닭." },
      ],
    });
  });

  it("표현 중 한 단어라도 뜻을 못 정하면 AI 풀이", () => {
    const phrase = { word: "부득이한 사유", easy: "어쩔 수 없는 사정", meaning: "AI 뜻" };
    const parts = [
      { id: "1-1", headword: "부득이하다", senses: [{ definition: "마지못하여 하는 수 없다." }] },
      { id: "1-2", headword: "사유", senses: [] },
    ];
    expect(mergeMeanings([{ entry: phrase, parts, sentence: "" }], new Map())[0]?.source).toBe(
      "ai",
    );
  });

  it("기본형을 쉼표로 나눈다", () => {
    expect(splitBase("부득이한 사유", "부득이하다, 사유")).toEqual(["부득이하다", "사유"]);
    expect(splitBase("경과한", "")).toEqual(["경과한"]);
  });

  it("뜻 고르기 응답 JSON을 읽는다", () => {
    expect(parsePicks('{"items":[{"id":"1-2","sense":2}]}').get("1-2")).toBe(2);
    expect(parsePicks("not json").size).toBe(0);
  });

  it("뜻이 하나뿐인 단어는 고르기 요청에 넣지 않는다", () => {
    const input = buildPickInput([
      {
        entry,
        parts: [
          { id: "1-1", headword: "세대", senses },
          { id: "1-2", headword: "가산세", senses: [{ definition: "x" }] },
        ],
        sentence: "문장",
      },
    ]);
    expect(input).toContain("[1-1]");
    expect(input).not.toContain("[1-2]");
  });
});

describe("우리말샘 XML 응답", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<channel><title>우리말샘</title><total>2</total>
<item><word>경과</word>
<sense><sense_no>001</sense_no><definition><![CDATA[시간이 지나감.]]></definition><pos>명사</pos><type>일반어</type></sense>
<sense><sense_no>002</sense_no><definition>일이 되어 가는 과정.</definition><pos>명사</pos><type>일반어</type></sense>
</item>
<item><word>경과</word><sense><definition>사투리 뜻</definition><type>지역어(방언)</type></sense></item>
</channel>`;

  it("XML도 JSON과 같이 뜻을 읽는다 (방언 제외)", () => {
    expect(parseOpendict(readPayload(xml), "경과").map((s) => s.definition)).toEqual([
      "시간이 지나감.",
      "일이 되어 가는 과정.",
    ]);
  });

  it("XML로 와도 사전 뜻을 찾는다", async () => {
    const ok = async () => new Response(xml);
    expect(await findSenses("경과한", "경과", "k", ok)).toHaveLength(2);
  });

  it("XML 오류 응답은 빈 결과", async () => {
    const err = async () =>
      new Response(
        `<?xml version="1.0"?><error><error_code>020</error_code><message>등록되지 않은 키</message></error>`,
      );
    expect(await findSenses("경과", undefined, "k", err)).toEqual([]);
    expect(readPayload("<error><error_code>020</error_code><message>x</message></error>")).toEqual({
      error: { error_code: "020", message: "x" },
    });
  });
});
