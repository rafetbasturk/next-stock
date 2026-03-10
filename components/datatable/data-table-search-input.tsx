"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DataTableSearchInputProps = {
  label: string;
  value: string;
  placeholder: string;
  clearLabel: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onFocus?: () => void;
  onBlur?: (value: string) => void;
  onEnter?: (value: string) => void;
  className?: string;
};

export function DataTableSearchInput({
  label,
  value,
  placeholder,
  clearLabel,
  onChange,
  onClear,
  onFocus,
  onBlur,
  onEnter,
  className,
}: DataTableSearchInputProps) {
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Input
        type="text"
        aria-label={label}
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={(event) => onBlur?.(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onEnter?.(event.currentTarget.value);
          }
        }}
        placeholder={placeholder}
        className="pr-8"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
          onClick={onClear}
          aria-label={clearLabel}
          title={clearLabel}
        >
          <XIcon className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
