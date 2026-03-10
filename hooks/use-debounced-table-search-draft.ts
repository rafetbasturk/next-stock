import { useCallback, useMemo, useState, useEffect } from "react";

import { debounce } from "@/lib/debounce";

type CommitOptions = {
  replace?: boolean;
};

type UseDebouncedTableSearchDraftOptions = {
  searchValue?: string;
  debounceMs?: number;
  minQueryLength?: number;
  onCommit: (value: string | undefined, options?: CommitOptions) => void;
};

export function useDebouncedTableSearchDraft({
  searchValue,
  debounceMs = 600,
  minQueryLength = 3,
  onCommit,
}: UseDebouncedTableSearchDraftOptions) {
  const [searchDraft, setSearchDraft] = useState(searchValue ?? "");
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const displayedSearchDraft = isSearchInputFocused
    ? searchDraft
    : (searchValue ?? "");

  const commitSearch = useCallback(
    (value: string, options?: CommitOptions) => {
      const normalizedDraft = value.trim();
      const normalizedCurrent = (searchValue ?? "").trim();
      const normalizedNext =
        normalizedDraft.length >= minQueryLength
          ? normalizedDraft
          : undefined;
      const normalizedCurrentQuery =
        normalizedCurrent.length >= minQueryLength
          ? normalizedCurrent
          : undefined;

      if (normalizedNext === normalizedCurrentQuery) return;

      onCommit(normalizedNext, options);
    },
    [minQueryLength, onCommit, searchValue],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        commitSearch(value, { replace: true });
      }, debounceMs),
    [commitSearch, debounceMs],
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchDraft(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleSearchFocus = useCallback(() => {
    setSearchDraft(searchValue ?? "");
    setIsSearchInputFocused(true);
  }, [searchValue]);

  const handleSearchBlur = useCallback(
    (value: string) => {
      setIsSearchInputFocused(false);
      debouncedSearch.cancel();
      commitSearch(value, { replace: true });
    },
    [commitSearch, debouncedSearch],
  );

  const handleSearchEnter = useCallback(
    (value: string) => {
      debouncedSearch.cancel();
      commitSearch(value, { replace: true });
    },
    [commitSearch, debouncedSearch],
  );

  const cancelSearchDebounce = useCallback(() => {
    debouncedSearch.cancel();
  }, [debouncedSearch]);

  const clearSearchDraft = useCallback(() => {
    setSearchDraft("");
  }, []);

  return {
    searchDraft: displayedSearchDraft,
    handleSearchChange,
    handleSearchFocus,
    handleSearchBlur,
    handleSearchEnter,
    cancelSearchDebounce,
    clearSearchDraft,
  };
}
