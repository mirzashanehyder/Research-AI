const TOKEN_KEY = 'rh_token';
const ROLE_KEY  = 'rh_role';

export const getToken  = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getRole   = (): string | null => localStorage.getItem(ROLE_KEY);

export const setToken = (token: string, role: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
};

export const isAuthenticated = (): boolean => !!getToken();

export const logout = (): void => {
  removeToken();
  window.location.href = '/login';
};
