const INVALID_REFRESH_TOKEN_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
]);

const INVALID_REFRESH_TOKEN_MESSAGES = [
  "invalid refresh token",
  "refresh token not found",
  "refresh token already used",
];

type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as AuthErrorLike;
  if (typeof code === "string" && INVALID_REFRESH_TOKEN_CODES.has(code.toLowerCase())) {
    return true;
  }

  if (typeof message !== "string") return false;
  const normalizedMessage = message.toLowerCase();
  return INVALID_REFRESH_TOKEN_MESSAGES.some((text) => normalizedMessage.includes(text));
}

export function isSupabaseAuthCookie(name: string, supabaseUrl: string) {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    return name === storageKey || name.startsWith(`${storageKey}.`);
  } catch {
    return false;
  }
}
