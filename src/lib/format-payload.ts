function deepParseJson(value: unknown): unknown {
  if (typeof value === "string") {
    const t = value.trim();
    if ((t.startsWith("{") || t.startsWith("[")) && t.length > 1) {
      try { return deepParseJson(JSON.parse(t)); } catch { /* not JSON */ }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(deepParseJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, deepParseJson(v)]),
    );
  }
  return value;
}

export function prettyPayload(value: unknown): string {
  try {
    return JSON.stringify(deepParseJson(value), null, 2);
  } catch {
    return String(value);
  }
}
