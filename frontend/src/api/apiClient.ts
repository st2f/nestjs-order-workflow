const API_BASE = '/api';

type RequestOptions = RequestInit & {
  accessToken?: string;
};

export async function request<T>(
  path: string,
  { accessToken, headers, body, ...init }: RequestOptions = {},
): Promise<T> {
  const requestHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    headers: requestHeaders,
    ...(body ? { body } : {}),
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
