'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [email, setEmail] = useState('admin@razorpay.com');
  const [password, setPassword] = useState('sentinel123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch {
      setError('Invalid credentials. Try admin@razorpay.com / sentinel123');
    } finally {
      setLoading(false);
    }
  }

  // Show loading during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sentinel-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sentinel-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sentinel-bg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_70%)]" />

      <div className="relative w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide">RAZORPAY SENTINEL</h1>
          <p className="text-sentinel-muted mt-1">Security Intelligence Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="sentinel-card space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="sentinel-label block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-sentinel-bg border border-sentinel-border rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="sentinel-label block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-sentinel-bg border border-sentinel-border rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Access Dashboard'}
          </button>
        </form>

        <p className="text-center text-xs text-sentinel-muted mt-6">
          Authorized personnel only · Razorpay Internal
        </p>
      </div>
    </div>
  );
}
