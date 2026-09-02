'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Cpu, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
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
        position: 'fixed', top: '-20%', right: '-10%',
        width: '50vw', height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
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
          background: 'linear-gradient(90deg, #6366f1, #ec4899, #0ea5e9)',
        }} />

        <div style={{ padding: '36px 32px' }}>
          {/* Logo + Title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(99,102,241,0.3)',
              marginBottom: 16,
            }}>
              <Cpu size={22} color="#fff" />
            </div>
            <h1 style={{
              color: '#f1f5f9', fontSize: 24, fontWeight: 800,
              letterSpacing: '-0.02em', marginBottom: 6,
            }}>
              Create Account
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Start designing cloud architectures
            </p>
          </div>

          {success ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 16px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 14,
            }}>
              <Mail size={28} color="#10b981" style={{ marginBottom: 12 }} />
              <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                Check your email
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>
                We sent a confirmation link to{' '}
                <strong style={{ color: '#e2e8f0' }}>{email}</strong>
              </p>
            </div>
          ) : (
            <>
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

              <form onSubmit={handleSignup}>
                {/* Name */}
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-name" style={{
                    display: 'block', color: '#94a3b8', fontSize: 13,
                    fontWeight: 600, marginBottom: 6,
                  }}>Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: '#475569',
                    }} />
                    <input
                      id="signup-name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      autoComplete="name"
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

                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-email" style={{
                    display: 'block', color: '#94a3b8', fontSize: 13,
                    fontWeight: 600, marginBottom: 6,
                  }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: '#475569',
                    }} />
                    <input
                      id="signup-email"
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
                  <label htmlFor="signup-password" style={{
                    display: 'block', color: '#94a3b8', fontSize: 13,
                    fontWeight: 600, marginBottom: 6,
                  }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: '#475569',
                    }} />
                    <input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
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

                {/* Sign Up Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px 24px',
                    background: loading
                      ? 'rgba(99,102,241,0.2)'
                      : 'linear-gradient(90deg, #6366f1, #ec4899)',
                    border: 'none', borderRadius: 12,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.65 : 1,
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.3)',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  {loading ? 'Creating account…' : <>Create Account <ArrowRight size={16} /></>}
                </button>
              </form>

              {/* Login link */}
              <p style={{
                textAlign: 'center', marginTop: 24,
                color: '#64748b', fontSize: 13,
              }}>
                Already have an account?{' '}
                <a href="/login" style={{
                  color: '#0ea5e9', fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Sign in
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
