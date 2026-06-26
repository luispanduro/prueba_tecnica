export const useAuth = () => ({
  user: null as null | { email: string; roles: string[]; permissions: string[] },
  isAuthenticated: false,
});
