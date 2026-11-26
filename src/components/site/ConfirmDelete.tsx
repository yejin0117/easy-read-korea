import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";

export function ConfirmDelete({
  label,
  title,
  description,
  onConfirm,
  iconOnly = false,
  textOnly = false,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
  iconOnly?: boolean;
  /** 카드 오른쪽 위에 놓는 작은 글자 버튼 */
  textOnly?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {textOnly ? (
          <button
            type="button"
            aria-label={label}
            className="inline-flex min-h-9 shrink-0 items-center rounded-full px-2 text-sm text-muted-foreground hover:text-destructive"
          >
            삭제
          </button>
        ) : iconOnly ? (
          <Button variant="destructive-outline" size="icon" aria-label={label}>
            <Trash2 aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="destructive-outline" size="sm">
            <Trash2 aria-hidden="true" />
            삭제
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>
            그대로 두기
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={onConfirm}
          >
            삭제하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
