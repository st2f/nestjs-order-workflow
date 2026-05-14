import type { SyntheticEvent } from "react";
import { useState } from "react";
import { LogIn } from "lucide-react";
import type { LoginResponse } from "../api/authApi";
import { authApi } from "../api/authApi";

type LoginPageProps = {
  onLogin: (session: LoginResponse) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const session = await authApi.login({ username, password });
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 text-gray-900">
      <section className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-semibold leading-tight text-gray-950">
          OrderFlow Debug
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Sign in with the seeded admin account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-gray-700">
            Username
            <input
              className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Password
            <input
              className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            <LogIn size={18} aria-hidden="true" />
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
