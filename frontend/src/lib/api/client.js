class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function fetchClient(endpoint, options = {}) {
  const baseUrl = "http://localhost:8000";
  const authToken =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // handle url params
  let url = `${baseUrl}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const headers = {
    ...(!(options.body instanceof FormData) && {
      "Content-Type": "application/json",
    }),
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      // redirect to login page
    }
    throw new ApiError("Unauthorized", 401);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.message || "API request failed", res.status);
  }

  return data;
}

export default fetchClient;
