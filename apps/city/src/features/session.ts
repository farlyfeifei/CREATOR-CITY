export type DemoSession = {
  email: string;
  displayName: string;
  signedInAt: string;
};

const SESSION_KEY = "creator-city-session";

export function loadSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

export function createSession(email: string): DemoSession {
  const localName = email.split("@")[0] || "creator";
  const session = {
    email,
    displayName: localName.replace(/[._-]+/g, " "),
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}
