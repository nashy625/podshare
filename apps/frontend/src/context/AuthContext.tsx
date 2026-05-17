import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  major?: string | null;
  year?: number | null;
  isVerified: boolean;
  isAdmin?: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: CurrentUser | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function applyAccessToken(accessToken: string | null) {
  if (accessToken) {
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data } = await api.get<{ user: CurrentUser | null }>("/api/auth/me");
    setUser(data.user);
  };

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      await applyAccessToken(data.session?.access_token ?? null);

      if (data.session?.access_token) {
        await api.post("/api/auth/verify", {
          accessToken: data.session.access_token,
        });
        await refreshUser();
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    bootstrap().catch(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      applyAccessToken(nextSession?.access_token ?? null).catch(() => undefined);

      if (nextSession?.access_token) {
        api
          .post("/api/auth/verify", { accessToken: nextSession.access_token })
          .then(() => refreshUser())
          .catch(() => setUser(null));
        return;
      }

      setUser(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      sendMagicLink: async (email: string) => {
        await api.post("/api/auth/magic-link", { email });
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
      },
      refreshUser,
    }),
    [loading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
