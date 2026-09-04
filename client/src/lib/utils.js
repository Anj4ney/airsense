/** Tiny class-name joiner (keeps JSX tidy without pulling in deps). */
export const cn = (...classes) => classes.filter(Boolean).join(' ');
