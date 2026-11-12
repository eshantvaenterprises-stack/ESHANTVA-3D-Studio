export type AccountMode = 'signin' | 'register' | 'forgot';

export type AccountSessionState = {
  loading: boolean;
  authenticated: boolean;
  anonymous: boolean;
  email: string | null;
  fullName: string | null;
};
