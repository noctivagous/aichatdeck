"use client";

import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";

type SessionOutlineToggleProps = {
  open: boolean;
  onToggle: () => void;
};

export function SessionOutlineToggle({
  open,
  onToggle,
}: SessionOutlineToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={onToggle}
      aria-label={open ? "Hide session outline" : "Show session outline"}
      aria-pressed={open}
      title={open ? "Hide session outline" : "Show session outline"}
    >
      {open ? (
        <PanelLeftClose className="h-4 w-4" />
      ) : (
        <PanelLeft className="h-4 w-4" />
      )}
    </Button>
  );
}