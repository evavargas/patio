import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintentar errores del servidor que no cambian solos (401/403/4xx).
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});
