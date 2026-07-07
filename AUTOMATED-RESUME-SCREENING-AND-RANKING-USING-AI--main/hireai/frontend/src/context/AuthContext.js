import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, login as apiLogin, register as apiRegister } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getMe()
        .then(u => setUser(u))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await apiLogin(email, password);
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user } = await apiRegister(data);
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
