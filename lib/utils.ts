/** Parse a comma-separated string into an array, filtering empty strings */
export function splitCSV(s: string): string[] {
  if (!s) return []
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}

/** Merge Tailwind class names */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
