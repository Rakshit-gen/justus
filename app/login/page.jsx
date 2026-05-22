'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthShell } from '@/components/AuthShell';

export default function LoginPage() {
  const { login, auth, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && auth?.token) router.replace('/chat');
  }, [auth, loading, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(name.trim(), password);
      router.replace('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to keep chatting"
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Name"
          type="text"
          value={name}
          onChange={setName}
          placeholder="your name"
          autoFocus
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••"
          required
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-600/30 transition active:scale-[0.99] hover:shadow-lg hover:shadow-brand-600/40 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}

function Field({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
        {...rest}
      />
    </label>
  );
}
