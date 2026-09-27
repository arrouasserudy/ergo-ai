/** First letter of the first two words: "Léa Martin" → ["L", "M"], "L. M." → ["L", "M"]. */
export function initialsOf(name: string): string[] {
  return name
    .split(/[\s.]+/)
    .map((w) => w.match(/\p{L}/u)?.[0]?.toUpperCase())
    .filter((c): c is string => Boolean(c))
    .slice(0, 2);
}

/**
 * The child's name as shown in hidden mode (settings): initials plus the start of the
 * id, so two children with the same initials stay distinct. "Léa Martin" → "L. M. #3F2A1C".
 */
export function maskedName(child: { id: string; name: string }): string {
  const initials = initialsOf(child.name)
    .map((c) => `${c}.`)
    .join(" ");
  const ref = `#${child.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  return initials ? `${initials} ${ref}` : ref;
}
