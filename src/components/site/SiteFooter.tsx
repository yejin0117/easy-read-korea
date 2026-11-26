import { Link } from "@tanstack/react-router";

import { FontSizeControl } from "./FontSizeControl";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t">
      <div className="container-page flex flex-col gap-4 py-8 text-[0.9375rem] text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          AI가 바꾼 글은 틀릴 수 있어요. 중요한 내용은 원문과 전문가에게 꼭 확인하세요.{" "}
          <Link to="/about" className="font-semibold text-foreground underline underline-offset-4">
            이용 전 주의사항
          </Link>
        </p>
        <FontSizeControl />
      </div>
    </footer>
  );
}
