
'use client';

import { useState } from 'react';
import {
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  UserRound,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Login failed. Please try again.');
        return;
      }

      // Force a fresh browser request so the dashboard
      // receives the newly created authentication cookie.
      window.location.assign('/dashboard');
    } catch (error) {
      console.error('Login request failed:', error);
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6f4] p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">

        {/* LEFT PANEL */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#123d2b] p-12 text-white md:flex">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full border border-white/10" />

          <div className="relative z-10">
            <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <HeartHandshake size={36} />
            </div>

            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              Kentalya PLC
            </p>

            <h1 className="text-4xl font-bold leading-tight">
              Welfare Management System
            </h1>

            <p className="mt-6 max-w-sm text-base leading-7 text-emerald-100/80">
              A central platform for managing employee welfare services,
              job cards, work activities and workplace support.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-emerald-100/70">
            <ShieldCheck size={19} />
            <span>Secure staff management portal</span>
          </div>
        </section>

        {/* LOGIN PANEL */}
        <section className="flex flex-col justify-center px-7 py-12 sm:px-12 lg:px-16">
          <div className="mb-10 md:hidden">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123d2b] text-white">
              <HeartHandshake size={30} />
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Kentalya PLC
            </p>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-emerald-800">
              WELCOME BACK
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Sign in to your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Enter your credentials to access the Welfare Management System.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* USERNAME */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Username
              </label>

              <div className="relative">
                <UserRound
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={19}
                />

                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm text-gray-900 outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10 disabled:opacity-60"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={19}
                />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-12 text-sm text-gray-900 outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17623f] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#124d32] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-10 text-center text-xs leading-5 text-gray-400">
            Kentalya PLC · Welfare Management System
            <br />
            Authorised personnel only
          </p>
        </section>
      </div>
    </main>
  );
}
