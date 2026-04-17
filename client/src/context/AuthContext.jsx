import { createContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      
      console.log('🔐 AuthContext Init - Token:', token ? `Present (${token.length} chars)` : 'Missing');
      console.log('🔐 AuthContext Init - User:', storedUser ? 'Present' : 'Missing');
      
      // Validate token exists and is not null string
      if (!token || token === 'null' || token === '') {
        if (token) console.warn('⚠️ Invalid token, clearing storage');
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        return null;
      }
      
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          console.log('✅ User loaded from storage:', parsed.email);
          return parsed;
        } catch (e) {
          console.error('❌ Failed to parse user JSON:', e.message);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          return null;
        }
      }
      return null;
    } catch (_error) {
      console.error('❌ AuthContext init error:', _error);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  });

  const login = (data) => {
    console.log('🔐 AuthContext.login called');
    
    if (!data || !data.token || !data.user) {
      console.error('❌ Invalid login data:', { hasData: !!data, hasToken: !!data?.token, hasUser: !!data?.user });
      return;
    }
    
    // Store token and user
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    console.log('✅ Login complete - token stored, user:', data.user.email);
  };

  const logout = () => {
    console.log('🔓 AuthContext.logout called');
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    console.log('✅ Logged out - storage cleared');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
