/** Zenith uses a single dark appearance. */
export type Theme = "dark";
export function useTheme() {
  return { theme: "dark" as const };
}
