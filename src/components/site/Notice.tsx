import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const STYLES = {
  warning: {
    box: "border-destructive/35 bg-destructive-soft",
    icon: "text-destructive",
    title: "text-destructive",
    Icon: AlertTriangle,
  },
  success: {
    box: "border-primary/30 bg-primary-soft",
    icon: "text-primary",
    title: "text-primary",
    Icon: CheckCircle2,
  },
  info: {
    box: "border-border bg-card",
    icon: "text-primary",
    title: "text-foreground",
    Icon: Info,
  },
} as const;

/** 경고·안내 상자: 색만이 아니라 아이콘과 제목 문구로도 뜻을 전합니다. */
export function Notice({
  tone,
  title,
  children,
  className,
}: {
  tone: keyof typeof STYLES;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const s = STYLES[tone];
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-2xl border-2 p-4", s.box, className)}
    >
      <s.Icon className={cn("mt-1 size-6 shrink-0", s.icon)} aria-hidden="true" />
      <div className="min-w-0">
        <p className={cn("font-bold", s.title)}>{title}</p>
        {children ? <div className="mt-0.5 text-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
