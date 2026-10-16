"use client";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "No se pudo iniciar sesión.");
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-pine px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="font-display text-2xl font-bold text-pine">Administración</h1>
        <label className="block text-sm font-semibold">Correo
          <input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded-lg border-2 border-stone-300 p-2.5" />
        </label>
        <label className="block text-sm font-semibold">Contraseña
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border-2 border-stone-300 p-2.5" />
        </label>
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-berry py-3 font-semibold text-white disabled:opacity-50">{busy ? "Ingresando…" : "Ingresar"}</button>
      </form>
    </main>
  );
}
