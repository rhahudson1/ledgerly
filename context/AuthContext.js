// context/AuthContext.js
"use client";                      // ← add this line
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth }               from "../lib/firebase";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      }),
    []
  );

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
