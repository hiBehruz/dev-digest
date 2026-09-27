/**
 * USD cost of a review run (or a PR's total). Missing data (un-priced model,
 * failed/cancelled run, run from before cost tracking) is `null` and renders
 * "—" — never "$0.00", which is reserved for a genuinely free run. Below 10¢
 * keep ~2 significant digits so sub-cent runs don't collapse to "$0.00".
 */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null) return "—";
  const small = Number(usd.toPrecision(2));
  return usd === 0 || small >= 0.1 ? `$${usd.toFixed(2)}` : `$${small}`;
}
