// Class names used in many places, kept here so we don't retype them.
// Each one is just a string of Tailwind classes.
// (Tailwind finds these strings by scanning the file, so each class must be
// written out in full, never built from pieces.)

// The centered column every page sits in.
export const page = 'mx-auto flex max-w-[860px] flex-col gap-5 px-5 pb-16 pt-8';

// A dark rounded box with a thin border.
export const card = 'rounded-xl border border-neutral-800 bg-neutral-900 p-5';

// Main green button (works on <button> and on links).
export const btn =
  'inline-block cursor-pointer rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:cursor-default disabled:opacity-40';

// Outlined button for less important actions.
export const btnSecondary =
  'inline-block cursor-pointer rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40';

// Small outlined button (the year arrows).
export const btnSmall =
  'cursor-pointer rounded-lg border border-neutral-700 px-3 py-1 text-neutral-100 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40';

// Normal text link.
export const link = 'text-blue-400 hover:underline';

// Warning / info message text.
export const notice = 'text-amber-400';