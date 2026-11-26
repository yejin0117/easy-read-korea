import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/convert", label: "변환" },
  { to: "/history", label: "내 기록" },
  { to: "/about", label: "소개" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container-page flex items-center justify-between gap-4 py-2.5">
        <Link
          to="/"
          className="flex min-h-11 items-center rounded-lg font-serif text-[1.5rem] font-bold text-foreground"
          aria-label="풀어읽기 처음 화면으로"
        >
          <span className="brand-mark">풀어읽기</span>
        </Link>

        <nav aria-label="주 메뉴" className="flex gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-h-11 items-center justify-center rounded-full px-4 text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{
                className: "bg-primary-soft !text-foreground",
                "aria-current": "page",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
