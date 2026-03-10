"use client";

import { Fragment, type ReactElement, type ReactNode } from "react";
import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DataTableActionsMenuItem = {
  key?: string;
  label: ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorAfter?: boolean;
  render?: ReactElement;
};

type DataTableActionsMenuProps = {
  items: DataTableActionsMenuItem[];
  align?: "start" | "center" | "end";
  srLabel?: string;
  stopPropagation?: boolean;
};

export function DataTableActionsMenu({
  items,
  align = "end",
  srLabel = "Open menu",
  stopPropagation = true,
}: DataTableActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" size="icon-sm" />}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
        }}
      >
        <span className="sr-only">{srLabel}</span>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, index) => (
          <Fragment key={item.key ?? `${index}-${String(item.label)}`}>
            <DropdownMenuItem
              disabled={item.disabled}
              variant={item.destructive ? "destructive" : undefined}
              render={item.render}
              onClick={(event) => {
                if (stopPropagation) {
                  event.stopPropagation();
                }
                item.onSelect?.();
              }}
            >
              {item.label}
            </DropdownMenuItem>
            {item.separatorAfter ? <DropdownMenuSeparator /> : null}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
