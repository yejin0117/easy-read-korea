import { Link } from "@tanstack/react-router";
import { BookOpenText } from "lucide-react";

import { FontSizeControl } from "./FontSizeControl";

const NAV = [
  { to: "/convert", label: "변환하기" },
  { to: "/history", label: "내 기록" },
  { to: "/about", label: "소개" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 rounded-lg text-[1.375rem] font-bold text-foreground"
          aria-label="풀어읽기 처음 화면으로"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenText className="size-6" aria-hidden="true" />
          </span>
          풀어읽기
        </Link>

        <nav
          aria-label="주 메뉴"
          className="order-3 grid w-full grid-cols-3 gap-1 md:order-none md:flex md:w-auto md:gap-2"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-h-11 items-center justify-center rounded-full px-4 text-[1.0625rem] font-semibold text-foreground transition-colors hover:bg-secondary"
              activeProps={{
                className: "bg-primary-soft text-primary",
                "aria-current": "page",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <FontSizeControl />
      </div>
    </header>
  );
}
