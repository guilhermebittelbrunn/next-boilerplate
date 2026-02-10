"use client";

import type { User } from "firebase/auth";
// biome-ignore lint: React required in scope for classic JSX runtime
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { subscribeToAuthState } from "./client";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

const AUTH_LOADING_TIMEOUT = 2000;

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Set a timeout to ensure loading doesn't stay true forever
    timeoutId = setTimeout(() => {
      setLoading(false);
    }, AUTH_LOADING_TIMEOUT);

    // biome-ignore lint/nursery/noShadow: callback param name matches domain (auth user)
    const unsubscribe = subscribeToAuthState((user: User | null) => {
      clearTimeout(timeoutId);
      setUser(user);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};