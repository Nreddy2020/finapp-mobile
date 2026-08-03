import { useEffect, useCallback } from "react";
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const initializing = useAuthStore((s) => s.initializing);
  const hydrateToken = useAuthStore((s) => s.hydrateToken);

  useEffect(() => {
    if (initializing) {
      hydrateToken();
    }
  }, [initializing]); // Remove hydrateToken from dependencies to prevent infinite loop

  return { accessToken, initializing };
}
