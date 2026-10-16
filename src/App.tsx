import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Dashboard from './components/Dashboard';
import { ModeratorLogin } from './components/ModeratorLogin';
import { backendService } from './services/BackendService';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = backendService.onAuthStateChange(nextSession => {
      if (!isMounted) return;
      setSession(nextSession);
      setIsAuthorized(false);
      if (!nextSession) setIsLoading(false);
      else setIsLoading(true);
    });

    backendService.getAuthSession()
      .then(nextSession => {
        if (!isMounted) return;
        setSession(nextSession);
      })
      .catch(error => {
        if (isMounted) setAuthError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    backendService.verifyModeratorSession()
      .then(() => {
        if (!isMounted) return;
        setIsAuthorized(true);
        setAuthError(null);
        setIsLoading(false);
      })
      .catch(async error => {
        if (!isMounted) return;
        setIsAuthorized(false);
        setAuthError(error instanceof Error ? error.message : String(error));
        setIsLoading(false);
        try {
          await backendService.signOut();
        } catch (signOutError) {
          console.error('Could not clear unauthorized session:', signOutError);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleSignOut = async () => {
    try {
      await backendService.signOut();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    }
  };

  if (isLoading) {
    return <main className="moderator-auth-loading">Checking moderator session...</main>;
  }

  return session && isAuthorized
    ? <Dashboard onSignOut={handleSignOut} />
    : <ModeratorLogin authError={authError} />;
}

export default App;
