import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/core/firebase";
import { syncUser } from "@/services/userService";

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  loading: true,
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  loginWithGoogle: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const sync = async () => {
      try {
        const token = await user.getIdToken();
        await syncUser(token);
      } catch (err) {
        // Don't block login flow if backend sync fails.
        console.error("User sync failed", err);
      }
    };

    void sync();
  }, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      isLoggedIn: !!user,
      user,
      loading,
      loginWithEmail: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signupWithEmail: async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
      },
      loginWithGoogle: async () => {
        await signInWithPopup(auth, googleProvider);
      },
      resetPassword: async (email: string) => {
        await sendPasswordResetEmail(auth, email);
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
