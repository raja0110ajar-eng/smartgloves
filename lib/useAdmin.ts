"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "./firebaseClient";

export function useAdmin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const r = await u.getIdTokenResult(true);
      setIsAdmin(r.claims.admin === true);
      setReady(true);
    });
  }, [router]);

  const api = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `gagal (HTTP ${res.status})`);
      return data;
    },
    []
  );

  return { ready, isAdmin, api };
}