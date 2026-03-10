// src/lib/debounce.ts
export function debounce<TFn extends (...args: Array<never>) => void>(
  fn: TFn,
  delay = 400,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = (...args: Parameters<TFn>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };

  run.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return run as ((...args: Parameters<TFn>) => void) & { cancel: () => void };
}
