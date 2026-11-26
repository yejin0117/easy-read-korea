import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { glossaryMeaningsFor, type GlossaryItem } from "@/lib/convert";
import { parseEasy } from "@/lib/easy-markup";

function ChangedWord({
  text,
  original,
  glossary,
}: {
  text: string;
  original: string;
  glossary: GlossaryItem[];
}) {
  const [open, setOpen] = useState(false);
  const meanings = glossaryMeaningsFor(original, glossary);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="marker-highlight inline cursor-help text-left text-foreground"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setOpen(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setOpen(false);
          }}
        >
          {text}
          <span className="sr-only"> (바뀐 말. 원래 말: {original})</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border p-4 text-base leading-[1.6] shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        side="top"
      >
        <p className="text-sm text-muted-foreground">원래 말</p>
        <p className="text-[1.125rem] font-bold">{original}</p>
        {meanings.length > 0 ? (
          <dl className="mt-3 space-y-2 border-t pt-3">
            {meanings.map((m) => (
              <div key={m.word}>
                <dt className="font-semibold">{m.word}</dt>
                <dd>{m.meaning}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function EasyText({ markup, glossary }: { markup: string; glossary: GlossaryItem[] }) {
  const paragraphs = parseEasy(markup);
  return (
    <div className="space-y-5 text-[1.125rem] leading-[1.9]">
      {paragraphs.map((p, i) => (
        <div key={i}>
          {p.heading ? <h4 className="mb-1 text-[1.125rem]">{p.heading}</h4> : null}
          {p.lines.map((line, j) => (
            <p key={j} className={j > 0 ? "mt-2" : undefined}>
              {line.map((seg, k) =>
                seg.type === "text" ? (
                  <span key={k}>{seg.text}</span>
                ) : (
                  <ChangedWord
                    key={k}
                    text={seg.text}
                    original={seg.original}
                    glossary={glossary}
                  />
                ),
              )}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
