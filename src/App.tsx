import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { AuthPage } from './features/auth/AuthPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EditorPage } from './features/editor/EditorPage';
import { supabase } from './lib/supabase';
import type { ProjectRecord } from './types/timeline';

function BoovyRouter() {
  const { user, loading } = useAuth();
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [sharedProject, setSharedProject] = useState<ProjectRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    const oauthPlatform = params.get('oauth');
    const oauthCode = params.get('code');

    if (shareId) {
      supabase
        .from('projects')
        .select('*')
        .eq('id', shareId)
        .eq('is_public', true)
        .single()
        .then(({ data }) => {
          if (data) setSharedProject(data as ProjectRecord);
        });
    }

    if (oauthPlatform && oauthCode) {
      supabase.functions
        .invoke('social-oauth', {
          body: {
            action: 'exchange_code',
            platform: oauthPlatform,
            code: oauthCode,
            redirectUri: `${window.location.origin}/?oauth=${oauthPlatform}`,
          },
        })
        .finally(() => {
          window.history.replaceState({}, '', '/');
        });
    }
  }, [user]);

  const handleRemixShared = async () => {
    if (!user || !sharedProject) return;
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: `${sharedProject.title} (Remix)`,
        aspect_ratio: sharedProject.aspect_ratio,
        timeline_data: sharedProject.timeline_data,
      })
      .select()
      .single();

    if (!error && data) {
      setSharedProject(null);
      window.history.replaceState({}, '', '/');
      setActiveProject(data as ProjectRecord);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6F7] flex items-center justify-center">
        <div className="text-sm font-medium text-[#6D7175]">Loading Boovy Studio...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (activeProject) {
    return (
      <EditorPage
        project={activeProject}
        onBack={() => setActiveProject(null)}
      />
    );
  }

  return (
    <>
      {sharedProject && (
        <div className="bg-[#008060] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            Shared Boovy Project: <strong>{sharedProject.title}</strong> ({sharedProject.aspect_ratio})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRemixShared}
              className="px-3.5 py-1.5 rounded-lg bg-white text-[#008060] text-xs font-semibold hover:bg-white/90 cursor-pointer"
            >
              Remix in Boovy
            </button>
            <button
              type="button"
              onClick={() => {
                setSharedProject(null);
                window.history.replaceState({}, '', '/');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-black/20 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <DashboardPage onOpenProject={(project) => setActiveProject(project)} />
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BoovyRouter />
    </AuthProvider>
  );
}

export default App;
