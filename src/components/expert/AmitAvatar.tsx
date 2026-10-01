import clsx from "clsx";

/**
 * Amit, the expert colleague: a small flat portrait (a warm, smiling OT in a brand-colored top).
 * Decorative: the surrounding control carries the accessible label.
 */
export function AmitAvatar({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={clsx("inline-block shrink-0 overflow-hidden rounded-full bg-tint", className)}>
      <svg viewBox="0 0 48 48" width={size} height={size} className="block">
        {/* Shoulders and collar */}
        <path d="M5 48c0-8.5 8-13.5 19-13.5S43 39.5 43 48z" fill="var(--color-primary)" />
        <path d="M19.5 35.2 24 40.5l4.5-5.3c-1.4-.4-2.9-.6-4.5-.6s-3.1.2-4.5.6z" fill="#fff" opacity=".9" />
        {/* Hair behind the face, then neck and face */}
        <path d="M13.2 27.5C11.4 16.5 16.4 9.2 24 9.2s12.6 7.3 10.8 18.3c-1 .9-2.2 1-3.4.4V21H16.6v6.9c-1.2.6-2.4.5-3.4-.4z" fill="#4a3226" />
        <path d="M20.5 28h7v7.2c-1 1.3-2.2 2-3.5 2s-2.5-.7-3.5-2z" fill="#e2a782" />
        <ellipse cx="24" cy="22.2" rx="9.2" ry="10.2" fill="#f4c7a6" />
        {/* Side-swept fringe */}
        <path d="M14.6 21.8c0-6.8 4-10.6 9.8-10.6 5.6 0 9.2 3.6 9 10-1.6-2.8-3.7-4.5-6.2-5.4-2.7 2.6-7.4 4.2-12.6 6z" fill="#4a3226" />
        {/* Eyes, cheeks, smile */}
        <circle cx="20.3" cy="23.4" r="1.2" fill="#2b1d16" />
        <circle cx="27.7" cy="23.4" r="1.2" fill="#2b1d16" />
        <circle cx="18.2" cy="26.8" r="1.6" fill="#ef8f7d" opacity=".4" />
        <circle cx="29.8" cy="26.8" r="1.6" fill="#ef8f7d" opacity=".4" />
        <path d="M21.5 27.7c1.5 1.4 3.5 1.4 5 0" fill="none" stroke="#7a3a2c" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
