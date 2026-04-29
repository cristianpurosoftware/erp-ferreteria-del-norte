// Utilidades de formateo para la plataforma

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoneyShort(amount: number): string {
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return `$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}MM`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `$${val >= 100 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function formatDate(dateStr: Date | string | number | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatDateShort(dateStr: Date | string | number | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

/**
 * Full date + time in 24h format — `18 abr 2026, 14:35`.
 * Used for audit/activity log entries where the exact moment matters.
 */
export function formatDateTime(dateStr: Date | string | number | undefined | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date}, ${time}`;
  } catch {
    return "";
  }
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export function getTodayFormatted(): string {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
