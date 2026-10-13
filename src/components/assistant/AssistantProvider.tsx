/**
 * Assistant open/closed state, shared by the floating launcher and the header
 * trigger so both drive the same panel.
 *
 * The transcript lives in `ShoppingAssistant` rather than here: the provider is
 * imported by the eagerly-loaded header, and it must stay tiny so it never drags
 * the panel into another route's initial bundle.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AssistantValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AssistantContext = createContext<AssistantValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantValue {
  return useContext(AssistantContext) ?? { open: false, setOpen: () => {} };
}
