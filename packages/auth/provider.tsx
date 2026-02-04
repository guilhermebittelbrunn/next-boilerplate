"use client";

import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { subscribeToAuthState } from "./client";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

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
    }, 2000);

    const unsubscribe = subscribeToAuthState((user) => {
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

