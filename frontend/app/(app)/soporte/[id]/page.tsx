"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  CheckCircle2,
  Undo2,
  Paperclip,
  Download,
  X,
  UserRoundPlus,
  RotateCcw,
  Lock,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getSupportTicketById,
  sendCustomerMessage,
  reopenSupportTicket,
  escalateSupportTicketToHuman,
  returnSupportTicketToAgent,
  transitionSupportTicket,
  buildAttachmentDownloadUrl,
} from "@/lib/actions/support-tickets";
import {
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_PRIORITY_LABELS,
  SUPPORT_TICKET_TYPE_LABELS,
  type SupportTicket,
  type SupportTicketMessage,
  type SupportTicketStatus,
  type SupportTicketPriority,
  type SupportTicketType,
  type SupportTicketAttachment,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

const statusColors: Record<SupportTicketStatus, string> = {
  created:     "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  review:      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  resolved:    "bg-p3/10 text-p4 dark:text-p2",
};
const priorityColors: Record<SupportTicketPriority, string> = {
  low:    "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  normal: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  high:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const typeColors: Record<SupportTicketType, string> = {
  bug:      "bg-red-500/10 text-red-600 dark:text-red-400",
  question: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  change:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const ATTACH_ACCEPT = "image/*,application/pdf,text/plain,text/csv,application/json,.log,.txt";

export default function SoporteDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const router = useRouter();
  const { can } = usePermissions();

  const [ticket, setTicket] = React.useState<SupportTicket | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [newMessage, setNewMessage] = React.useState("");
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await getSupportTicketById(ticketId);
      setTicket(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => { void load(); }, [load]);

  const isAgentActive = ticket?.agentState === "ai_working";
  React.useEffect(() => {
    if (!isAgentActive) return;
    const t = setInterval(() => { void load(); }, 4000);
    return () => clearInterval(t);
  }, [isAgentActive, load]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [ticket?.messages?.length, isAgentActive]);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setPendingFiles((prev) => [...prev, ...picked].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const body = newMessage.trim();
    if (!body || sending) return;
    if (ticket?.status === "resolved") return;
    setSending(true);
    try {
      await sendCustomerMessage(ticketId, body, pendingFiles);
      setNewMessage("");
      setPendingFiles([]);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  }

  async function runAction(label: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Acción fallida");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !ticket) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!ticket) {
    return (
      <div className="p-6">
        <Link href="/soporte" className="text-sm text-primary hover:underline">← Volver a soporte</Link>
        <p className="mt-4 text-sm text-muted-foreground">Ticket no encontrado.</p>
      </div>
    );
  }

  const status = ticket.status;
  const agentState = ticket.agentState ?? "idle";
  const messages = ticket.messages ?? [];
  const attachments = ticket.attachments ?? [];
  const ticketNumber = ticket.ticketNumber != null
    ? `#${String(ticket.ticketNumber).padStart(4, "0")}`
    : null;

  const canComment = status !== "resolved" && can("support_tickets:comment");
  const canResolve = can("support_tickets:resolve");
  const canUpdate = can("support_tickets:update");
  const isHandoff = agentState === "human_handoff";

  const attachmentsByMessage = groupAttachmentsByMessage(attachments);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/soporte")} className="gap-1 -ml-2">
          <ArrowLeft className="size-4" /> Soporte
        </Button>
      </div>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2 min-w-0">
          <LifeBuoy className="size-6 text-primary shrink-0 mt-1" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight flex items-center gap-2 flex-wrap">
              {ticketNumber && <span className="text-muted-foreground font-mono text-xl">{ticketNumber}</span>}
              <span>{ticket.title}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Abierto {formatDateTime(ticket.createdAt)} · Última actividad {formatDateTime(ticket.lastActivityAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[status])}>
            {SUPPORT_TICKET_STATUS_LABELS[status] ?? status}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColors[ticket.priority])}>
            {SUPPORT_TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", typeColors[ticket.type] ?? "bg-muted text-muted-foreground")}>
            {SUPPORT_TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}
          </span>
        </div>
      </header>

      {isHandoff && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          <UserRoundPlus className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-700 dark:text-amber-400">Una persona del equipo está atendiendo este ticket.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Podés seguir escribiendo — vas a recibir respuesta desde el equipo humano.</p>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-border bg-card flex flex-col h-[70vh] min-h-[520px]">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Conversación con Soporte</h2>
          {isAgentActive && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <span className="typing-dots" aria-hidden>
                <span>•</span><span>•</span><span>•</span>
              </span>
              Soporte está escribiendo
            </span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">Todavía no hay mensajes.</p>
          )}
          {messages.map((m) => (
            <MessageItem
              key={m.id}
              message={m}
              ticketId={ticketId}
              attachments={attachmentsByMessage.get(m.id) ?? []}
            />
          ))}
          {isAgentActive && <TypingBubble />}
        </div>

        {status === "resolved" ? (
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="size-3.5" /> Ticket resuelto. Usá "Reabrir" abajo si querés volver a retomarlo.
          </div>
        ) : (
          <form onSubmit={handleSend} className="border-t border-border px-4 py-3 space-y-2">
            {pendingFiles.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {pendingFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-1 text-xs rounded-md border border-border bg-muted/30 px-2 py-1 max-w-xs">
                    <Paperclip className="size-3 shrink-0" />
                    <span className="truncate" title={f.name}>{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Quitar archivo"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={2}
                maxLength={5000}
                disabled={!canComment || sending}
                placeholder={canComment
                  ? "Escribí un mensaje… Enter envía, Shift+Enter salto de línea"
                  : "No tenés permiso para escribir en este ticket"}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canComment || sending || pendingFiles.length >= 10}
                title="Adjuntar archivos"
              >
                <Paperclip className="size-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ATTACH_ACCEPT}
                onChange={handleFilesSelected}
                className="hidden"
              />
              <Button type="submit" size="sm" disabled={!canComment || sending || !newMessage.trim()}>
                <Send className="size-3.5 mr-1.5" />
                {sending ? "..." : "Enviar"}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Acciones</h3>
        <div className="flex flex-wrap gap-2">
          {status === "resolved" ? (
            canResolve && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction("Ticket reabierto", () => reopenSupportTicket(ticketId))}>
                <Undo2 className="size-3.5 mr-1.5" /> Reabrir ticket
              </Button>
            )
          ) : (
            <>
              {(canResolve || canUpdate) && !isHandoff && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction("Derivado a humano", () => escalateSupportTicketToHuman(ticketId))}>
                  <UserRoundPlus className="size-3.5 mr-1.5" /> Derivar a humano
                </Button>
              )}
              {(canResolve || canUpdate) && isHandoff && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction("Devuelto a soporte automático", () => returnSupportTicketToAgent(ticketId))}>
                  <RotateCcw className="size-3.5 mr-1.5" /> Devolver a soporte automático
                </Button>
              )}
              {canResolve && (
                <Button size="sm" disabled={busy} onClick={() => runAction("Ticket resuelto", () => transitionSupportTicket(ticketId, "resolved"))}>
                  <CheckCircle2 className="size-3.5 mr-1.5" /> Marcar como resuelto
                </Button>
              )}
            </>
          )}
        </div>
      </section>

      <style jsx>{`
        .typing-dots span {
          animation: blink 1.4s infinite both;
          display: inline-block;
          margin: 0 1px;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function groupAttachmentsByMessage(attachments: SupportTicketAttachment[]): Map<string, SupportTicketAttachment[]> {
  const map = new Map<string, SupportTicketAttachment[]>();
  for (const a of attachments) {
    if (!a.messageId) continue;
    const arr = map.get(a.messageId) ?? [];
    arr.push(a);
    map.set(a.messageId, arr);
  }
  return map;
}

function MessageItem({
  message,
  ticketId,
  attachments,
}: {
  message: SupportTicketMessage;
  ticketId: string;
  attachments: SupportTicketAttachment[];
}) {
  if (message.senderRole === "system") {
    return <SystemMessage message={message} />;
  }
  const isCustomer = message.senderRole === "customer";
  return (
    <div className={cn("flex", isCustomer ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] flex flex-col gap-1", isCustomer ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isCustomer
              ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
              : "bg-muted text-foreground rounded-bl-sm",
          )}
        >
          {isCustomer ? message.body : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock
                    ? <code className="block bg-black/10 rounded px-2 py-1 text-xs font-mono my-1 whitespace-pre-wrap">{children}</code>
                    : <code className="bg-black/10 rounded px-1 text-xs font-mono">{children}</code>;
                },
                pre: ({ children }) => <pre className="my-1">{children}</pre>,
                h1: ({ children }) => <h1 className="font-bold text-base mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="font-semibold mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="font-medium mb-1">{children}</h3>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{children}</a>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-current/30 pl-2 italic my-1">{children}</blockquote>,
              }}
            >
              {message.body}
            </ReactMarkdown>
          )}
        </div>
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} ticketId={ticketId} attachment={a} />
            ))}
          </ul>
        )}
        <span className="text-[10px] text-muted-foreground">
          {isCustomer ? "Vos" : "Soporte"} · {formatDateTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: SupportTicketMessage }) {
  const kind = (message.metadata as Record<string, unknown> | null)?.kind;
  const Icon = kind === "agent_failed" ? AlertTriangle : Info;
  const tone = kind === "agent_failed" ? "text-red-500" : "text-muted-foreground";
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
        <Icon className={cn("size-3", tone)} />
        <span>{message.body}</span>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-1">
        <span className="typing-dots" aria-hidden>
          <span>•</span><span>•</span><span>•</span>
        </span>
      </div>
    </div>
  );
}

function AttachmentChip({ ticketId, attachment }: { ticketId: string; attachment: SupportTicketAttachment }) {
  const [downloading, setDownloading] = React.useState(false);
  const sizeKb = Number(attachment.sizeBytes) / 1024;
  const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb.toFixed(0)} KB`;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const href = await buildAttachmentDownloadUrl(ticketId, attachment.id);
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo descargar");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-1 text-[11px] rounded-md border border-border bg-background hover:bg-muted px-2 py-1 transition-colors max-w-xs"
        title={`${attachment.fileName} · ${sizeLabel}`}
      >
        <Download className="size-3 shrink-0" />
        <span className="truncate">{attachment.fileName}</span>
        <span className="text-muted-foreground shrink-0">· {sizeLabel}</span>
      </button>
    </li>
  );
}
