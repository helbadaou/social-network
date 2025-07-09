import { useState, useEffect, useCallback } from "react";
import fetchClient from "@/lib/api/client";

function useApi(endpoint, options = { method: "GET", skip: false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!options.skip);

  const fetchData = useCallback(async () => {
    if (options.skip) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchClient(endpoint, options);
      setData(result);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [
    endpoint,
    options.method,
    options.body,
    options.params,
    options.headers,
    options.skip,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, reFetch: fetchData };
}

export default useApi;
