import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const STEPS = [100, 112.5, 125, 137.5, 150];
const KEY = "pureo:font-step";
const DEFAULT_STEP = 0;

export function FontSizeControl() {
  const [step, setStep] = useState(DEFAULT_STEP);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < STEPS.length) setStep(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${STEPS[step] ?? 100}%`;
    window.localStorage.setItem(KEY, String(step));
  }, [step]);

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="글씨 크기 조절">
      <span className="mr-1">글씨 크기</span>
      <Button
        variant="outline"
        size="icon"
        className="w-auto px-3 text-base"
        aria-label="글씨 작게"
        disabled={step === 0}
        onClick={() => setStep((s) => Math.max(0, s - 1))}
      >
        가−
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="w-auto px-3 text-lg"
        aria-label="글씨 크게"
        disabled={step === STEPS.length - 1}
        onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
      >
        가+
      </Button>
    </div>
  );
}
