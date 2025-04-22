"use client";

import { AuthProvider } from "../../context/AuthContext";

export default function ClientLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
