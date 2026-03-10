// src/stores/auth-store.ts
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import { createSelectors } from "./utils";

export type AuthStatus = "pending" | "authenticated" | "unauthenticated";

export interface AuthUser {
  id: number;
  username: string;
  role: "admin" | "user"
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  authStatus: AuthStatus;

  // synchronous actions only
  setUser: (user: AuthUser | null) => void;
  setAuthStatus: (status: AuthStatus) => void;
  clearSessionStore: () => void;
}

const authStore = createWithEqualityFn<AuthState>()(
  (set) => ({
    user: null,
    isAuthenticated: false,
    authStatus: "pending",
    setUser(user) {
      set({
        user,
        isAuthenticated: !!user,
        authStatus: user ? "authenticated" : "unauthenticated",
      });
    },
    setAuthStatus(status) {
      set({
        authStatus: status,
        isAuthenticated: status === "authenticated",
      });
    },
    clearSessionStore() {
      set({
        user: null,
        isAuthenticated: false,
        authStatus: "unauthenticated",
      });
    },
  }),
  shallow
);

export const authStoreApi = authStore;

export const useAuthStore = createSelectors(authStore);
