/** Full allowance is green; one remaining miss takes priority even for one-credit courses. */
export function attendanceColor(left: number, allowed: number, excess = 0) {
  if (excess > 0 || left < 0) return "#b91c1c";
  if (left <= 1) return "#ef4444";
  if (left < allowed) return "#eab308";
  return "#22c55e";
}
