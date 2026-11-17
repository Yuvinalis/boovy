import { useState, type FormEvent } from 'react';
import { Film, Sparkles, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BoovyLogo } from '../../components/BoovyLogo';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

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
