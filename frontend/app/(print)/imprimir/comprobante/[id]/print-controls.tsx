"use client";

import * as React from "react";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintControls() {
  React.useEffect(() => {
    const id = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="no-print sticky top-0 z-10 border-b bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[200mm] items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 rounded-md border border-black/20 bg-white px-3 py-1.5 text-xs font-medium text-black shadow-sm hover:bg-black/5"
        >
          <ArrowLeft className="size-3.5" /> Volver
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-black/85"
        >
          <Printer className="size-3.5" /> Imprimir / guardar PDF
        </button>
      </div>
    </div>
  );
}
