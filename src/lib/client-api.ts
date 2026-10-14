export async function clientApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-wealthquest-request": "1",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as T & { ok?: boolean; message?: string };
  if (!response.ok) {
    const error = new Error(body.message ?? "The table could not complete that.");
    (error as Error & { body?: T }).body = body;
    throw error;
  }
  return body;
}

export function actionKey() {
  return crypto.randomUUID();
}
