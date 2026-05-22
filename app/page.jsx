'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { auth, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(auth?.token ? '/chat' : '/login');
  }, [auth, loading, router]);

  return (
    <div className="auth-bg flex h-full items-center justify-center">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-500" />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-500" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-500" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
