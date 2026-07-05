import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

type ListQueryMeta = {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  retrying: boolean;
};

/** Coerce list API payloads to arrays — use in list page queryFns. */
export function normalizeListData<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : [];
}

export function useListQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError> & { list: ListQueryMeta } {
  const result = useQuery(options);
  return {
    ...result,
    list: {
      isLoading: result.isLoading,
      isError: result.isError,
      onRetry: () => {
        void result.refetch();
      },
      retrying: result.isFetching && !result.isLoading,
    },
  };
}
