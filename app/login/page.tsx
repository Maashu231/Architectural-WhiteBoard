'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Cpu, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background gradient orbs */}
      <div style={{
        position: 'fixed', top: '-20%', left: '-10%',
        width: '50vw', height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', right: '-10%',
        width: '40vw', height: '40vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'linear-gradient(160deg, rgba(15,23,42,0.97) 0%, rgba(10,17,35,0.99) 100%)',
        border: '1px solid rgba(14,165,233,0.2)',
        borderRadius: 20,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(14,165,233,0.05)',
        overflow: 'hidden',
        animation: 'slide-up 0.3s ease-out both',
      }}>
        {/* Top gradient strip */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, #0ea5e9, #6366f1, #ec4899)',
        }} />

        <div style={{ padding: '36px 32px' }}>
          {/* Logo + Title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(14,165,233,0.3)',
              marginBottom: 16,
            }}>
              <Cpu size={22} color="#fff" />
            </div>
            <h1 style={{
              color: '#f1f5f9', fontSize: 24, fontWeight: 800,
              letterSpacing: '-0.02em', marginBottom: 6,
            }}>
              Cloud Architect
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Sign in to your workspace
            </p>
          </div>

          {magicLinkSent ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 16px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 14,
            }}>
              <Sparkles size={28} color="#10b981" style={{ marginBottom: 12 }} />
              <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                Check your email
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>
                We sent a magic link to <strong style={{ color: '#e2e8f0' }}>{email}</strong>
              </p>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div style={{
                  marginBottom: 16, padding: '12px 14px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10, color: '#f87171', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailLogin}>
                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="login-email" style={{
                    display: 'block', color: '#94a3b8', fontSize: 13,
                    fontWeight: 600, marginBottom: 6,
                  }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: '#475569',
                    }} />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      style={{
                        width: '100%', padding: '11px 12px 11px 38px',
                        background: 'rgba(2,6,23,0.6)',
                        border: '1px solid rgba(14,165,233,0.2)',
                        borderRadius: 10, color: '#f1f5f9', fontSize: 14,
                        outline: 'none', transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                      onBlur={e => e.target.style.borderColor = 'rgba(14,165,233,0.2)'}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="login-password" style={{
                    display: 'block', color: '#94a3b8', fontSize: 13,
                    fontWeight: 600, marginBottom: 6,
                  }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: '#475569',
                    }} />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      style={{
                        width: '100%', padding: '11px 12px 11px 38px',
                        background: 'rgba(2,6,23,0.6)',
                        border: '1px solid rgba(14,165,233,0.2)',
                        borderRadius: 10, color: '#f1f5f9', fontSize: 14,
                        outline: 'none', transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                      onBlur={e => e.target.style.borderColor = 'rgba(14,165,233,0.2)'}
                    />
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px 24px',
                    background: loading
                      ? 'rgba(14,165,233,0.2)'
                      : 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                    border: 'none', borderRadius: 12,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.65 : 1,
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(14,165,233,0.3)',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  {loading ? 'Signing in…' : <>Sign In <ArrowRight size={16} /></>}
                </button>
              </form>

              {/* Divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                margin: '20px 0', color: '#334155', fontSize: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.1)' }} />
                or
                <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.1)' }} />
              </div>

              {/* Magic Link */}
              <button
                onClick={handleMagicLink}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 24px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#94a3b8',
                  fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.18s',
                  fontFamily: 'inherit',
                }}
              >
                <Mail size={16} />
                Send Magic Link
              </button>

              {/* Sign up link */}
              <p style={{
                textAlign: 'center', marginTop: 24,
                color: '#64748b', fontSize: 13,
              }}>
                Don&apos;t have an account?{' '}
                <a href="/signup" style={{
                  color: '#0ea5e9', fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Sign up
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
