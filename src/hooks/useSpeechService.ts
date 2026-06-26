import { useEffect, useState } from "react";
import { speechService } from "@/lib/speechService";

/** Subscribe to speechService changes and re-render when state updates. */
export function useSpeechService() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = speechService.subscribe(() => setTick((t) => t + 1));
    return () => { unsub(); };
  }, []);
  return speechService;
}
