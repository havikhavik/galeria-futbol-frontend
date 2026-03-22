import { useCallback, useEffect, useState } from "react";

type UseApiDataOptions<T> = {
  initialData: T;
  immediate?: boolean;
};

export function useApiData<T>(
  fetcher: () => Promise<T>,
  { initialData, immediate = true }: UseApiDataOptions<T>,
) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextData = await fetcher();
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (!immediate) return;

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nextData = await fetcher();
        if (!cancelled) {
          setData(nextData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [immediate, fetcher]);

  return {
    data,
    setData,
    isLoading,
    error,
    reload: load,
  };
}
