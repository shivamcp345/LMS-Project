import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { getCurrentUser, logoutUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("lms_token")),
  );

  useEffect(() => {
    const token = localStorage.getItem("lms_token");
    const cachedUser = localStorage.getItem("lms_user");

    if (!token) return;

    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (error) {
        console.error("Invalid cached user:", error);
        localStorage.removeItem("lms_user");
      }
    }

    getCurrentUser()
      .then((response) => {
        const userData = response.data;
        setUser(userData);
        localStorage.setItem("lms_user", JSON.stringify(userData));
      })
      .catch((error) => {
        console.error("Session verification failed:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback((response) => {
    const { token, user } = response.data;

    if (!token || !user) {
      console.error("Invalid login response:", response);
      return;
    }

    localStorage.setItem("lms_token", token);
    localStorage.setItem("lms_user", JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      localStorage.removeItem("lms_token");
      localStorage.removeItem("lms_user");

      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
