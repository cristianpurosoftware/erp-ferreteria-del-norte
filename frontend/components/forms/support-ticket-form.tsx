"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSupportTicket, getSupportAgentStatus } from "@/lib/actions/support-tickets";
import {
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_TYPE_LABELS,
  type SupportTicketPriority,
  type SupportTicketType,
} from "@/lib/types";
import { Paperclip, X, AlertTriangle } from "lucide-react";

const PRIORITIES: SupportTicketPriority[] = ["low", "normal", "high", "urgent"];
const TYPES: SupportTicketType[] = ["bug", "question", "change"];
const APP_ENVS = ["production", "staging", "development", "otro"] as const;
const ATTACH_ACCEPT = "image/*,application/pdf,text/plain,text/csv,application/json,.log,.txt";
const MAX_FILES = 10;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function SupportTicketForm({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<SupportTicketType | "">("");
  const [priority, setPriority] = React.useState<SupportTicketPriority>("normal");
  const [appEnv, setAppEnv] = React.useState<string>("production");
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [agentMissing, setAgentMissing] = React.useState<string[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setType("");
      setPriority("normal");
      setAppEnv("production");
      setFiles([]);
      setSubmitting(false);
      return;
    }
    void getSupportAgentStatus()
      .then((s) => setAgentMissing(s.configured ? null : s.missing))
      .catch(() => setAgentMissing(null));
  }, [open]);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setFiles((prev) => {
      const combined = [...prev, ...picked].slice(0, MAX_FILES);
      return combined;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Completá el título y la descripción");
      return;
    }
    if (!type) {
      toast.error("Elegí un tipo de ticket");
      return;
    }
    setSubmitting(true);
    try {
      await createSupportTicket({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        appEnv: appEnv || undefined,
      }, files);
      toast.success("Ticket creado");
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo ticket de soporte</DialogTitle>
            <DialogDescription>
              Describí el problema con el mayor detalle posible. Un humano o el agente lo revisará.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label htmlFor="support-ticket-title" className="text-sm font-medium">
                Título
              </label>
              <input
                id="support-ticket-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Ej: No puedo crear pedidos con descuento"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="support-ticket-desc" className="text-sm font-medium">
                Descripción
              </label>
              <textarea
                id="support-ticket-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10000}
                required
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Pasos para reproducir, qué esperabas, qué pasó..."
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="support-ticket-type" className="text-sm font-medium">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                id="support-ticket-type"
                value={type}
                onChange={(e) => setType(e.target.value as SupportTicketType)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                <option value="" disabled>— Elegí un tipo —</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{SUPPORT_TICKET_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Attachments */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Adjuntos ({files.length}/{MAX_FILES})</label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length >= MAX_FILES}
                >
                  <Paperclip className="size-3.5 mr-1" />
                  Adjuntar
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ATTACH_ACCEPT}
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </div>
              {files.length > 0 && (
                <ul className="divide-y divide-border border border-border rounded-md">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="truncate" title={f.name}>{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {f.type || "desconocido"} · {(f.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label="Quitar archivo"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {agentMissing && agentMissing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-600 dark:text-amber-400">Soporte automático no está disponible</p>
                  <p className="text-muted-foreground mt-0.5">
                    El ticket se creará igual, pero va a esperar a que una persona del equipo lo revise.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="support-ticket-priority" className="text-sm font-medium">
                  Prioridad
                </label>
                <select
                  id="support-ticket-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {SUPPORT_TICKET_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="support-ticket-env" className="text-sm font-medium">
                  Ambiente
                </label>
                <select
                  id="support-ticket-env"
                  value={appEnv}
                  onChange={(e) => setAppEnv(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  {APP_ENVS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
