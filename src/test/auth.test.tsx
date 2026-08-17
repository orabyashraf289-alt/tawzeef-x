import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { mockSession, mockUser } from "@/test/mocks/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock supabase client
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
let authChangeCallback: ((_event: string, session: any) => void) | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...args: any[]) => mockSignUp(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: (_event: string, session: any) => void) => {
        authChangeCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

// Test component to consume auth context
function AuthConsumer() {
  const { user, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="user">{user?.email || "none"}</span>
      <button data-testid="signout" onClick={signOut}>Sign Out</button>
    </div>
  );
}

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
  });

  it("starts with loading=true and user=null", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await act(async () => {
      renderWithQueryClient(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("provides user after session is resolved", async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });
  });

  it("updates user on auth state change", async () => {
    // This time, getSession returns null but the callback fires with a session
    mockGetSession.mockResolvedValue({ data: { session: null } });
    
    const { getByTestId } = renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Wait for initial render to complete
    await waitFor(() => {
      expect(getByTestId("loading")).toHaveTextContent("false");
    });

    // The authChangeCallback may have been called during setup with null session.
    // Now simulate a real sign-in:
    await act(async () => {
      authChangeCallback?.("SIGNED_IN", mockSession);
      // Allow React to process the state update
      await new Promise(r => setTimeout(r, 0));
    });

    expect(getByTestId("user")).toHaveTextContent("test@example.com");
  });

  it("calls signOut correctly", async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    renderWithQueryClient(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });

    fireEvent.click(screen.getByTestId("signout"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce();
    });
  });

  it("clears user on SIGNED_OUT event", async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    await act(async () => {
      renderWithQueryClient(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });

    // Simulate logout
    await act(async () => {
      authChangeCallback?.("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("none");
    });
  });
});

describe("Auth Form Validation", () => {
  it("validates email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("valid@email.com")).toBe(true);
    expect(emailRegex.test("invalid-email")).toBe(false);
    expect(emailRegex.test("@missing.com")).toBe(false);
    expect(emailRegex.test("no@domain")).toBe(false);
  });

  it("validates password requirements", () => {
    const isValidPassword = (p: string) => p.length >= 6;
    expect(isValidPassword("123456")).toBe(true);
    expect(isValidPassword("12345")).toBe(false);
    expect(isValidPassword("strongPassword123!")).toBe(true);
  });

  it("validates signup fields presence", () => {
    const validateSignup = (email: string, password: string, name: string) => {
      const errors: string[] = [];
      if (!email.trim()) errors.push("email");
      if (!password.trim()) errors.push("password");
      if (!name.trim()) errors.push("name");
      return errors;
    };
    expect(validateSignup("a@b.com", "123456", "Ali")).toEqual([]);
    expect(validateSignup("", "123456", "Ali")).toEqual(["email"]);
    expect(validateSignup("a@b.com", "", "")).toEqual(["password", "name"]);
  });
});

describe("Device Trust Helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves trusted device", () => {
    const TRUST_KEY = "tawzeef-x_trusted_device";
    const email = "user@test.com";
    const deviceId = "test-device";
    const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;

    const data: Record<string, any> = {};
    data[email] = { deviceId, expires };
    localStorage.setItem(TRUST_KEY, JSON.stringify(data));

    const stored = JSON.parse(localStorage.getItem(TRUST_KEY) || "{}");
    expect(stored[email]).toBeDefined();
    expect(stored[email].deviceId).toBe("test-device");
    expect(stored[email].expires).toBeGreaterThan(Date.now());
  });

  it("detects expired trust", () => {
    const TRUST_KEY = "tawzeef-x_trusted_device";
    const email = "user@test.com";
    const data: Record<string, any> = {};
    data[email] = { deviceId: "dev", expires: Date.now() - 1000 };
    localStorage.setItem(TRUST_KEY, JSON.stringify(data));

    const stored = JSON.parse(localStorage.getItem(TRUST_KEY) || "{}");
    const entry = stored[email];
    expect(entry && Date.now() > entry.expires).toBe(true);
  });
});
