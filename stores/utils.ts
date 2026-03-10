import type { StoreApi, UseBoundStore } from "zustand";

type WithSelectors<TStore, TState extends object> = TStore & {
  use: { [TKey in keyof TState]: () => TState[TKey] };
};

export const createSelectors = <
  TState extends object,
  TStore extends UseBoundStore<StoreApi<TState>>,
>(
  _store: TStore,
) => {
  const store = _store as WithSelectors<TStore, TState>;
  const use = {} as Record<keyof TState, () => TState[keyof TState]>;
  for (const k of Object.keys(store.getState()) as Array<keyof TState>) {
    use[k] = () => store((s) => s[k]);
  }
  store.use = use as WithSelectors<TStore, TState>["use"];

  return store;
};
