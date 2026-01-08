/**
 * Formats milliseconds into a string: "HHh MMm SSs"
 */
export function formatCooldown(ms: number): string {
  if (ms <= 0) return "Ready";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Formatting to "00h 00m 00s"
  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  const s = String(seconds).padStart(2, "0");

  return `${h}h ${m}m ${s}s`;
}
