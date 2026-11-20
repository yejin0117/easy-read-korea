import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t">
      <div className="container-page flex flex-col gap-3 py-8 text-base md:flex-row md:items-center md:justify-between">
        <p className="font-semibold">풀어읽기</p>
        <p className="text-muted-foreground">
          AI가 바꾼 글은 틀릴 수 있어요. 중요한 내용은 원문과 전문가에게 꼭 확인하세요.
        </p>
        <Link to="/about" className="font-semibold text-primary underline underline-offset-4">
          이용 전 주의사항
        </Link>
      </div>
    </footer>
  );
}
