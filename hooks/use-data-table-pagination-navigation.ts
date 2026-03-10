import { useCallback } from "react";

type NavigateOptions = {
  replace?: boolean;
};

type NavigateFn<TSearch> = (
  updates: Partial<TSearch>,
  options?: NavigateOptions,
) => void;

type UseDataTablePaginationNavigationOptions<
  TSearch extends { pageIndex: number; pageSize: number },
> = {
  navigate: NavigateFn<TSearch>;
  pageIndex: number;
};

export function useDataTablePaginationNavigation<
  TSearch extends { pageIndex: number; pageSize: number },
>({
  navigate,
  pageIndex,
}: UseDataTablePaginationNavigationOptions<TSearch>) {
  const onPageSizeChange = useCallback(
    (value: number) => {
      navigate(
        {
          pageSize: value,
          pageIndex: 0,
        } as Partial<TSearch>,
        { replace: true },
      );
    },
    [navigate],
  );

  const onPrev = useCallback(() => {
    navigate({ pageIndex: pageIndex - 1 } as Partial<TSearch>);
  }, [navigate, pageIndex]);

  const onNext = useCallback(() => {
    navigate({ pageIndex: pageIndex + 1 } as Partial<TSearch>);
  }, [navigate, pageIndex]);

  return {
    onPageSizeChange,
    onPrev,
    onNext,
  };
}
