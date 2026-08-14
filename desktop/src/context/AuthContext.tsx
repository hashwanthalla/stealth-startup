import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@shared/types";
import { api } from "../lib/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("codeviz_token"));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      return;
    }
    const status = await api.billingStatus();
    setUser(status.user);
  };

  useEffect(() => {
    const boot = async () => {
      try {
        if (token) await refreshUser();
      } catch {
        localStorage.removeItem("codeviz_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) => {
        const result = await api.login(email, password);
        localStorage.setItem("codeviz_token", result.token);
        setToken(result.token);
        setUser(result.user);
      },
      register: async (email, password) => {
        const result = await api.register(email, password);
        localStorage.setItem("codeviz_token", result.token);
        setToken(result.token);
        setUser(result.user);
      },
      logout: () => {
        localStorage.removeItem("codeviz_token");
        setToken(null);
        setUser(null);
      },
      refreshUser,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
