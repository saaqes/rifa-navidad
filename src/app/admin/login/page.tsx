"use client";
import { useState } from "react";
import { Bauble, DecorRow, Lights, Snowfall } from "@/components/Decor";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: f.get("username"), password: f.get("password") }),
      });
      if (res.ok) {
        window.location.href = "/admin";
        return;
      }
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo iniciar sesión.");
    } catch {
      setError("Sin conexión con el servidor.");
    }
    setBusy(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Snowfall />
      <Lights />
      <Bauble className="left-[12%] top-10" size={48} />
      <Bauble className="right-[12%] top-10" color="#d4a437" size={48} delay={0.9} />
      <div className="relative z-10 w-full max-w-sm">
        <form onSubmit={onSubmit} className="panel fade-up space-y-4 p-6">
          <div className="text-center">
            <div className="floaty inline-block text-5xl" aria-hidden>🎅</div>
            <h1 className="font-display text-2xl font-black text-pine">Administración</h1>
            <p className="text-sm text-stone-600">Gran Rifa Navideña</p>
          </div>
          <label className="block text-sm font-bold">Usuario
            <input name="username" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} className="input mt-1" />
          </label>
          <label className="block text-sm font-bold">Contraseña
            <input name="password" type="password" required autoComplete="current-password" className="input mt-1" />
          </label>
          {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "Ingresando…" : "Ingresar"}</button>
        </form>
        <div className="mt-6"><DecorRow /></div>
      </div>
    </main>
  );
}
