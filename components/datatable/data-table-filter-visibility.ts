type DataTableFilterVisibilityInput = {
  hasSecondaryFilters: boolean;
  hasActiveSearch: boolean;
  hasActiveSecondaryFilters: boolean;
};

export function getDataTableFilterVisibility({
  hasSecondaryFilters,
  hasActiveSearch,
  hasActiveSecondaryFilters,
}: DataTableFilterVisibilityInput) {
  const hasAnyActiveFilters = hasActiveSearch || hasActiveSecondaryFilters;

  return {
    hasAnyActiveFilters,
    showClearAllButton: hasSecondaryFilters,
    showFilterChips: hasSecondaryFilters && hasActiveSecondaryFilters,
  };
}
