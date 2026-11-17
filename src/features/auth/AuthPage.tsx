import { useState, type FormEvent } from 'react';
import { Film, Sparkles, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BoovyLogo } from '../../components/BoovyLogo';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
          },
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Account created! Check your email to confirm, or sign in if confirmation is disabled.',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Authentication failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F7] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <div className="flex justify-center mb-6">
          <BoovyLogo />
        </div>

        <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-[#202223]">
              {mode === 'signin' ? 'Sign in to Boovy Studio' : 'Create your Boovy account'}
            </h1>
            <p className="text-sm text-[#6D7175] mt-1">
              Edit, keyframe, and export videos directly in your browser.
            </p>
          </div>

          {message && (
            <div
              className={`mb-4 rounded-lg px-3.5 py-2.5 text-sm border ${
                message.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAuth}
            className="w-full min-h-[44px] rounded-lg border border-[#C9CCCF] bg-white hover:bg-[#F6F6F7] disabled:opacity-60 text-[#202223] font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E1E3E5]" />
            <span className="text-xs text-[#6D7175] uppercase">or</span>
            <div className="h-px flex-1 bg-[#E1E3E5]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Creator name"
                  className="w-full rounded-lg border border-[#C9CCCF] px-3 py-2 text-sm text-[#202223] focus:outline-none focus:ring-2 focus:ring-[#5C6AC4] focus:border-[#5C6AC4]"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#202223] mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#C9CCCF] px-3 py-2 text-sm text-[#202223] focus:outline-none focus:ring-2 focus:ring-[#5C6AC4] focus:border-[#5C6AC4]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202223] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#C9CCCF] px-3 py-2 text-sm text-[#202223] focus:outline-none focus:ring-2 focus:ring-[#5C6AC4] focus:border-[#5C6AC4]"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#C9CCCF] px-3 py-2 text-sm text-[#202223] focus:outline-none focus:ring-2 focus:ring-[#5C6AC4] focus:border-[#5C6AC4]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-lg bg-[#008060] hover:bg-[#006E52] disabled:opacity-60 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              {loading
                ? 'Please wait...'
                : mode === 'signin'
                  ? 'Sign in to Studio'
                  : 'Create Boovy Account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#E1E3E5] text-center text-sm text-[#6D7175]">
            {mode === 'signin' ? (
              <>
                New to Boovy?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setMessage(null);
                  }}
                  className="text-[#008060] font-medium hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setMessage(null);
                  }}
                  className="text-[#008060] font-medium hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-[#6D7175]">
          <div className="bg-white/70 rounded-lg border border-[#E1E3E5] p-2.5 flex flex-col items-center gap-1">
            <Film className="h-4 w-4 text-[#008060]" />
            <span>Multi-Track NLE</span>
          </div>
          <div className="bg-white/70 rounded-lg border border-[#E1E3E5] p-2.5 flex flex-col items-center gap-1">
            <Layers className="h-4 w-4 text-[#5C6AC4]" />
            <span>AE Keyframes</span>
          </div>
          <div className="bg-white/70 rounded-lg border border-[#E1E3E5] p-2.5 flex flex-col items-center gap-1">
            <Sparkles className="h-4 w-4 text-[#F49342]" />
            <span>Canva + CapCut</span>
          </div>
        </div>
      </div>
    </div>
  );
}
