"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PopoverPortalContainerProvider } from "@/components/ui/popover";
import { Loader2 } from "lucide-react";

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export function FormDrawer({
  open,
  onOpenChange,
  title,
  children,
  onSubmit,
  loading = false,
  submitLabel = "Guardar",
}: FormDrawerProps) {
  const [portalContainer, setPortalContainer] = React.useState<HTMLDivElement | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 px-2 text-muted-foreground"
            >
              Cerrar
            </Button>
          </div>
        </SheetHeader>

        <div ref={setPortalContainer} className="flex-1 overflow-y-auto px-6 py-4">
          <PopoverPortalContainerProvider container={portalContainer}>
            {children}
          </PopoverPortalContainerProvider>
        </div>

        <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
