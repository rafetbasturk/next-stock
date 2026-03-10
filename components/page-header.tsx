"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  enableBackButton?: boolean;
  hideBackButton?: boolean;
  actions?: ReactElement | null;
  leading?: ReactElement | null;
};

export function PageHeader({
  title,
  enableBackButton = false,
  hideBackButton = false,
  actions = null,
  leading = null,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <header className="bg-background border-b flex h-14 min-w-0 items-center px-2 md:px-6">
      <div className="flex min-w-0 grow items-center gap-2">
        {leading}
        {enableBackButton && !hideBackButton ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeftIcon />
            <span className="hidden sm:inline">Geri</span>
          </Button>
        ) : null}
        <h1 id="page-title" className="truncate text-md md:text-2xl font-medium">
          {title}
        </h1>
      </div>
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
