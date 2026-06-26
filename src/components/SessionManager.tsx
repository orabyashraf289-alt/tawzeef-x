import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export function SessionManager() {
  useSessionTimeout();
  return null;
}
