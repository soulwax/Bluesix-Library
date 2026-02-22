"use client";

import { PanelTopClose, PanelTopOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CompactModeToggleProps {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
}

export function CompactModeToggle({
  enabled,
  onToggle,
  className,
}: CompactModeToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={enabled ? "default" : "outline"}
          size="icon"
          disableTooltip
          className={cn("h-8 w-8", className)}
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={
            enabled ? "Disable really compact mode" : "Enable really compact mode"
          }
        >
          {enabled ? (
            <PanelTopOpen className="h-4 w-4" />
          ) : (
            <PanelTopClose className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {enabled ? "Disable really compact mode" : "Enable really compact mode"}
      </TooltipContent>
    </Tooltip>
  );
}
