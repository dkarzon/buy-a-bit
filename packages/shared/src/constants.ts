/** Local ports — keep in sync with .env.example */
export const LOCAL_API_PORT = 3001;
export const LOCAL_WEB_PORT = 5173;

export const LOCAL_API_URL = `http://localhost:${LOCAL_API_PORT}`;
export const LOCAL_WEB_URL = `http://localhost:${LOCAL_WEB_PORT}`;

/** Order status values for UI badges / filters */
export const ORDER_STATUSES = ["pending", "paid", "failed"] as const;
