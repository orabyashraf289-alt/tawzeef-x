import React from "react";
import { vi } from "vitest";

// Mock navigation
export const mockNavigate = vi.fn();
export const mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
    useParams: () => ({}),
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});
