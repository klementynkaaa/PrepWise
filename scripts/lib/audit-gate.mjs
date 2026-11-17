// Decides whether `npm audit --json` output blocks CI, given the reviewed
// exceptions in `.github/audit-exceptions.json`.
//
// Only high and critical advisories block. An advisory is let through only
// when an exception names its GHSA id and its `reviewBy` date has not passed;
// an expired exception blocks again, so every exception is looked at again.

const BLOCKING = new Set(["high", "critical"]);
const GHSA = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/;

/** Unique advisories (not package chains) found in an npm audit v2 report. */
export function advisories(report) {
  const found = new Map();
  for (const entry of Object.values(report?.vulnerabilities ?? {})) {
    for (const via of entry.via ?? []) {
      if (typeof via !== "object" || via === null) continue;
      const id = GHSA.exec(via.url ?? "")?.[0] ?? String(via.source);
      if (!found.has(id)) {
        found.set(id, { id, name: via.name, severity: via.severity, title: via.title });
      }
    }
  }
  return [...found.values()];
}

/** Validates the exceptions file and returns its entries. Throws on a bad entry. */
export function parseExceptions(data) {
  const list = data?.exceptions;
  if (!Array.isArray(list)) throw new Error("audit exceptions: `exceptions` must be an array");
  return list.map((entry, index) => {
    const where = `audit exceptions[${index}]`;
    if (!GHSA.test(entry?.id ?? "") || entry.id !== GHSA.exec(entry.id)[0]) {
      throw new Error(`${where}: \`id\` must be a GHSA id`);
    }
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 20) {
      throw new Error(`${where}: \`reason\` must explain why it is safe (20+ characters)`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewBy ?? "")) {
      throw new Error(`${where}: \`reviewBy\` must be a YYYY-MM-DD date`);
    }
    return { id: entry.id, reason: entry.reason, reviewBy: entry.reviewBy };
  });
}

/**
 * @param report npm audit --json output
 * @param exceptions entries from parseExceptions
 * @param today YYYY-MM-DD (UTC)
 * @returns {{ blocking: object[], excepted: object[], expired: object[], unused: object[] }}
 */
export function evaluateAudit(report, exceptions, today) {
  const byId = new Map(exceptions.map((e) => [e.id, e]));
  const result = { blocking: [], excepted: [], expired: [], unused: [] };
  const seen = new Set();
  for (const advisory of advisories(report)) {
    if (!BLOCKING.has(advisory.severity)) continue;
    const exception = byId.get(advisory.id);
    if (exception) seen.add(exception.id);
    if (!exception) {
      result.blocking.push(advisory);
    } else if (exception.reviewBy < today) {
      result.expired.push({ ...advisory, reviewBy: exception.reviewBy });
      result.blocking.push(advisory);
    } else {
      result.excepted.push({ ...advisory, reason: exception.reason, reviewBy: exception.reviewBy });
    }
  }
  result.unused = exceptions.filter((e) => !seen.has(e.id));
  return result;
}
