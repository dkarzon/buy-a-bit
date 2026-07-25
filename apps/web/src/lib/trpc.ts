import type { AppRouter } from "api/router";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${apiUrl}/trpc`,
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
