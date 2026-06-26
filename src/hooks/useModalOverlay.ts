"use client";

import { useEffect } from "react";
import { useDashboard } from "@/context/DashboardContext";

/**
 * Call at the top of any modal component to register it with the global overlay counter.
 * QuickActionsMenu (and any other surface) hides itself whenever anyOverlayOpen is true.
 *
 * - No argument: modal is open whenever it is mounted (parent controls conditional rendering).
 * - Boolean argument: modal is open when the value is true (component is always mounted).
 */
export function useModalOverlay(isOpen?: boolean): void {
  const { pushOverlay, popOverlay } = useDashboard();

  useEffect(() => {
    // If a boolean was passed and it's false, this overlay is currently closed — do nothing.
    if (isOpen === false) return;

    pushOverlay();
    return () => popOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
