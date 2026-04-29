import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type ModelMessage } from 'ai';
import { env } from '../../config/env';
import { logger } from '../../common/logger';

export type AgentStatus = {
  enabled: boolean;
  configured: boolean;
  missing: string[];
  baseUrlConfigured: boolean;
  model: string;
};

/**
 * Structured metadata the agent should emit at the end of each reply so the
 * ERP can move the ticket forward without having to interpret free text.
 *
 * The agent SHOULD NOT mention any of these field names to the customer —
 * we strip the meta block from the visible message before rendering.
 */
export type AgentMetadata = {
  ticketStatus?: 'in_progress' | 'review' | 'resolved';
  agentState?: 'waiting_customer' | 'awaiting_review' | 'human_handoff' | 'failed';
  handoffReason?: string;
  stateChangeMessage?: string;
};

export type AgentReply = {
  visibleMessage: string;
  meta: AgentMetadata;
  rawText: string;
};

export function agentEnabled(): boolean {
  return env.HERMES_ENABLED && Boolean(env.HERMES_API_BASE_URL && env.HERMES_API_KEY);
}

export function agentStatus(): AgentStatus {
  const missing: string[] = [];
  if (!env.HERMES_ENABLED) missing.push('HERMES_ENABLED');
  if (!env.HERMES_API_BASE_URL) missing.push('HERMES_API_BASE_URL');
  if (!env.HERMES_API_KEY) missing.push('HERMES_API_KEY');
  return {
    enabled: env.HERMES_ENABLED,
    configured: missing.length === 0,
    missing,
    baseUrlConfigured: Boolean(env.HERMES_API_BASE_URL),
    model: env.HERMES_MODEL,
  };
}

let _model: ReturnType<ReturnType<typeof createOpenAICompatible>> | null = null;
function getModel() {
  if (_model) return _model;
  if (!env.HERMES_API_BASE_URL || !env.HERMES_API_KEY) {
    throw new Error('Agent provider not configured');
  }
  const provider = createOpenAICompatible({
    name: 'hermes',
    baseURL: `${env.HERMES_API_BASE_URL}/v1`,
    apiKey: env.HERMES_API_KEY,
  });
  _model = provider(env.HERMES_MODEL);
  return _model;
}

const META_DELIMITER = '---SUPPORT_META---';

function buildSystemPrompt(ctx: { ticketTitle: string; ticketType: string; ticketNumber?: string | null; appEnv: string | null }): string {
  const ticketRef = ctx.ticketNumber ? ` (#${ctx.ticketNumber})` : '';
  return [
    'Actuás como el equipo de soporte técnico de Puro Software (ERP multi-cliente).',
    `Cliente actual: ${env.CLIENT_SLUG}. Ticket${ticketRef}: "${ctx.ticketTitle}" (tipo: ${ctx.ticketType}${ctx.appEnv ? `, ambiente: ${ctx.appEnv}` : ''}).`,
    '',
    'Estilo de respuesta:',
    '- Escribís en castellano rioplatense, tono profesional y cercano.',
    '- Nunca menciones que sos una IA, ni nombres como "Hermes", "modelo", "agente".',
    '- El cliente te ve como "Soporte".',
    '- Nunca expongas secrets, tokens, rutas internas, nombres de herramientas ni logs crudos.',
    '- Si usaste herramientas para investigar, NO lo menciones. Solo devolvé la conclusión.',
    '',
    'Flujo de resolución (IMPORTANTE — seguilo en orden antes de decidir cómo responder):',
    '',
    '1) ENTENDER EL SÍNTOMA',
    '   Leé el ticket completo y mirá adjuntos. Si faltan datos concretos (módulo, nro de registro, pasos de reproducción), hacele al cliente UNA pregunta puntual y quedate en agentState=waiting_customer.',
    '',
    '2) INVESTIGAR con las skills ANTES de opinar',
    '   - sync_client_repo → actualizá el repo local para leer código.',
    '   - query_erp_api → estado real de entidades del cliente (sólo GET).',
    '   - fetch_axiom_logs → errores y ventana temporal si el ticket menciona un fallo visible.',
    '',
    '3) DECIDIR RUTA (una sola):',
    '',
    '   (a) RESOLVER CON PR — preferido cuando aplica.',
    '       Criterio: fix ACOTADO y de BAJO RIESGO. Ejemplos válidos:',
    '         · Campo mostrado mal en una pantalla (prop equivocada, DTO mapeado mal).',
    '         · Copy/label/formateo/locale/redondeo de fechas o números.',
    '         · Filtro, orden o paginación con key errónea.',
    '         · Typo o fallback faltante en un render condicional.',
    '       Usá la skill open_pr: rama fix/ticket-<N>, base DEV (nunca main), título "fix(soporte): <resumen> (#<N>)".',
    '       Respuesta al cliente (literal, no inventes otra cosa): "Ya subí el fix al repositorio. Queda pendiente que el equipo técnico lo revise y despliegue — te avisamos cuando esté aplicado."',
    '       Meta: agentState=human_handoff, ticketStatus=review, handoffReason="PR abierto esperando revisión técnica", stateChangeMessage="PR abierto: <html_url>".',
    '',
    '   (b) RESPONDER SIN CAMBIAR CÓDIGO — cuando es consulta de uso, datos existentes o algo que el cliente puede resolver solo.',
    '       Meta: agentState=waiting_customer.',
    '',
    '   (c) DERIVAR A HUMANO (agentState=human_handoff) SOLO si:',
    '         · Necesitás credenciales, autorización o decisión de negocio del cliente.',
    '         · El fix requiere migración de datos, cambio de schema, o tocar producción.',
    '         · El bug es grande (varios módulos, lógica de negocio compleja, seguridad/compliance).',
    '         · open_pr falló por razones de token/permiso/conflicto.',
    '       En handoffReason describí técnicamente qué encontraste y por qué requiere persona humana.',
    '',
    '   NO derivar por inercia. Derivar es la última opción, no la primera.',
    '',
    'Reglas duras:',
    '- Nunca abrir PR contra main/master/prod. Siempre dev.',
    '- Nunca modificar datos productivos (ni por API ni por migración).',
    '- Nunca intentes POST/PUT/PATCH/DELETE contra el ERP — el rol support es read-only.',
    '',
    'Formato de respuesta:',
    '- Primero el mensaje que verá el cliente (markdown permitido: listas, negritas, code blocks).',
    `- Al final agregás ${META_DELIMITER} seguido de un objeto JSON con estos campos opcionales:`,
    '  {',
    '    "ticketStatus": "in_progress" | "review" | "resolved" | null,',
    '    "agentState": "waiting_customer" | "awaiting_review" | "human_handoff" | "failed" | null,',
    '    "handoffReason": string | null,',
    '    "stateChangeMessage": string | null',
    '  }',
    '- ticketStatus=resolved solo si confirmaste el fix desplegado. Mientras el PR está abierto usá "review".',
    '- Cuando abrís un PR poné en stateChangeMessage exactamente: "PR abierto: <html_url>".',
    '- El cliente NO ve el delimitador ni el JSON — el sistema los recorta antes de renderizar.',
  ].join('\n');
}

function parseAgentReply(rawText: string): AgentReply {
  const idx = rawText.indexOf(META_DELIMITER);
  if (idx === -1) {
    return { visibleMessage: rawText.trim(), meta: {}, rawText };
  }
  const visibleMessage = rawText.slice(0, idx).trim();
  const metaBlock = rawText.slice(idx + META_DELIMITER.length).trim();

  const jsonMatch = metaBlock.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { visibleMessage, meta: {}, rawText };
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const meta: AgentMetadata = {};
    if (['in_progress', 'review', 'resolved'].includes(parsed.ticketStatus)) meta.ticketStatus = parsed.ticketStatus;
    if (['waiting_customer', 'awaiting_review', 'human_handoff', 'failed'].includes(parsed.agentState)) meta.agentState = parsed.agentState;
    if (typeof parsed.handoffReason === 'string') meta.handoffReason = parsed.handoffReason;
    if (typeof parsed.stateChangeMessage === 'string') meta.stateChangeMessage = parsed.stateChangeMessage;
    return { visibleMessage, meta, rawText };
  } catch {
    return { visibleMessage, meta: {}, rawText };
  }
}

export async function generateSupportReply(
  ticketCtx: { ticketTitle: string; ticketType: string; ticketNumber?: string | null; appEnv: string | null },
  conversation: ModelMessage[],
): Promise<AgentReply> {
  const system = buildSystemPrompt(ticketCtx);
  const started = Date.now();
  try {
    const result = await generateText({
      model: getModel(),
      system,
      messages: conversation,
    });
    const reply = parseAgentReply(result.text);
    logger.info({
      ticketTitle: ticketCtx.ticketTitle,
      durationMs: Date.now() - started,
      usage: result.usage,
      hasMeta: Object.keys(reply.meta).length > 0,
    }, 'agent reply generated');
    return reply;
  } catch (err) {
    logger.error({ err, ticketTitle: ticketCtx.ticketTitle }, 'agent request failed');
    throw err;
  }
}
