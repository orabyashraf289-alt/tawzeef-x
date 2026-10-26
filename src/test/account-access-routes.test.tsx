import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProtectedRoute from "@/components/ProtectedRoute";
const { check } = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "test" }, loading: false, signOut: vi.fn() }) }));
vi.mock("@/lib/accountAccess", async importOriginal => ({ ...(await importOriginal<any>()), checkCompanyStatus: check }));
vi.mock("@/components/Skeletons", () => ({ PageSkeleton: () => <p>Loading</p> }));
function open(path = "/dashboard") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/dashboard" element={<ProtectedRoute><p>Company workspace</p></ProtectedRoute>} />
    <Route path="/company-registration" element={<p>Request status</p>} />
    <Route path="/applicant-dashboard" element={<ProtectedRoute><p>My applications</p></ProtectedRoute>} />
    <Route path="/seeker-dashboard" element={<ProtectedRoute><p>My applications</p></ProtectedRoute>} />
    <Route path="/onboarding" element={<p>Registration form</p>} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return client;
}
beforeEach(() => vi.clearAllMocks());
describe("account route protection", () => {
  it.each([
    [{ allowed: true, registrationRequired: true }, "Request status"],
    [{ allowed: true, isApplicant: true }, "My applications"],
    [{ allowed: true, onboardingRequired: true }, "Registration form"],
  ])("does not mount tenant content for a limited account", async (access, destination) => {
    check.mockResolvedValue(access); open();
    expect(await screen.findByText(destination)).toBeInTheDocument();
    expect(screen.queryByText("Company workspace")).not.toBeInTheDocument();
  });
  it("keeps an already approved company accessible", async () => {
    check.mockResolvedValue({ allowed: true }); open();
    expect(await screen.findByText("Company workspace")).toBeInTheDocument();
  });
  it("blocks the page when server validation fails", async () => {
    check.mockResolvedValue({ allowed: false, reason: "Cannot verify company" }); open();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Cannot verify company"));
    expect(screen.queryByText("Company workspace")).not.toBeInTheDocument();
  });
});


describe("applicant dashboard route isolation", () => {
  it.each(["/applicant-dashboard", "/seeker-dashboard"])("does not mount applicant data for staff at %s", async path => {
    check.mockResolvedValue({ allowed: true, isApplicant: false }); open(path);
    expect(await screen.findByRole("alert")).toHaveTextContent("هذا الحساب تابع لجهة توظيف");
    expect(screen.queryByText("My applications")).not.toBeInTheDocument();
  });
  it.each(["/applicant-dashboard", "/seeker-dashboard"])("keeps applicant access at %s", async path => {
    check.mockResolvedValue({ allowed: true, isApplicant: true }); open(path);
    expect(await screen.findByText("My applications")).toBeInTheDocument();
  });
});
