"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PageHelpTooltip({ content }: { content: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Información sobre esta pantalla"
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="max-w-xs whitespace-normal leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
