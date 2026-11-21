import { describe, expect, it, vi } from "vitest";

import { modelOrder, requestEasyText } from "./gemini-client";

const TEXT = "기한 경과 시 과태료가 부과될 수 있음. 신청서를 기재하여 제출하여야 함.";
const GOOD = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              summary: ["a", "b", "c"],
              easy_markup: "기한이 {지나면|경과 시} 돈을 낼 수 있어요.",
              words: [{ word: "경과", easy: "지남", meaning: "시간이 지나감" }],
            }),
          },
        ],
      },
    },
  ],
});

const reply = (status: number, body = "{}") => new Response(body, { status });
const noSleep = () => Promise.resolve();
const modelOf = (url: string) => decodeURIComponent(url.split("/models/")[1]!.split(":")[0]!);

describe("Gemini 재시도", () => {
  it("붐빔(503) 뒤 같은 모델로 다시 시도해 성공한다", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply(503))
      .mockResolvedValueOnce(reply(200, GOOD));
    const res = await requestEasyText({
      apiKey: "k",
      models: ["m1", "m2"],
      text: TEXT,
      level: "middle",
      fetcher,
      sleep: noSleep,
    });
    expect(res.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(modelOf(fetcher.mock.calls[1]![0])).toBe("m1");
  });

  it("한 모델이 계속 붐비면 다음 모델로 넘어간다", async () => {
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(modelOf(url) === "m1" ? reply(503) : reply(200, GOOD)),
    );
    const res = await requestEasyText({
      apiKey: "k",
      models: ["m1", "m2"],
      text: TEXT,
      level: "middle",
      fetcher,
      sleep: noSleep,
    });
    expect(res).toMatchObject({ ok: true, model: "m2" });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("모델이 없으면(404) 기다리지 않고 바로 다음 모델로 간다", async () => {
    const sleep = vi.fn(noSleep);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply(404))
      .mockResolvedValueOnce(reply(200, GOOD));
    const res = await requestEasyText({
      apiKey: "k",
      models: ["old", "m2"],
      text: TEXT,
      level: "middle",
      fetcher,
      sleep,
    });
    expect(res).toMatchObject({ ok: true, model: "m2" });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("모두 붐비면 '사용량 많음'으로 알린다", async () => {
    const fetcher = vi.fn(() => Promise.resolve(reply(503)));
    const res = await requestEasyText({
      apiKey: "k",
      models: ["m1", "m2"],
      text: TEXT,
      level: "middle",
      fetcher,
      sleep: noSleep,
    });
    expect(res).toEqual({ ok: false, reason: "too-many" });
  });

  it("키 오류(400)만 나면 '실패'로 알린다", async () => {
    const fetcher = vi.fn(() => Promise.resolve(reply(400)));
    const res = await requestEasyText({
      apiKey: "k",
      models: ["m1"],
      text: TEXT,
      level: "middle",
      fetcher,
      sleep: noSleep,
    });
    expect(res).toEqual({ ok: false, reason: "failed" });
  });

  it("GEMINI_MODEL을 맨 앞에 두고 중복은 뺀다", () => {
    expect(modelOrder("gemini-2.5-flash")[0]).toBe("gemini-2.5-flash");
    expect(new Set(modelOrder("gemini-2.5-flash")).size).toBe(
      modelOrder("gemini-2.5-flash").length,
    );
  });
});
