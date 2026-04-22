import { useState, useCallback } from "react";

export type PanelContent = {
  type:
    | "livrable"
    | "phase"
    | "milestone"
    | "iteration"
    | "decision"
    | "incoherence"
    | "agent_action";
  id: string;
  data?: Record<string, unknown>;
};

interface State {
  open: boolean;
  content: PanelContent | null;
  stack: PanelContent[];
}

export function useSidePanel() {
  const [state, setState] = useState<State>({
    open: false,
    content: null,
    stack: [],
  });

  const openPanel = useCallback((content: PanelContent) => {
    setState({ open: true, content, stack: [] });
  }, []);

  const pushPanel = useCallback((content: PanelContent) => {
    setState((s) => ({
      open: true,
      content,
      stack: s.content ? [...s.stack, s.content] : s.stack,
    }));
  }, []);

  const popPanel = useCallback(() => {
    setState((s) => {
      if (s.stack.length === 0)
        return { open: false, content: null, stack: [] };
      const prev = s.stack[s.stack.length - 1];
      return { open: true, content: prev, stack: s.stack.slice(0, -1) };
    });
  }, []);

  const closePanel = useCallback(() => {
    setState({ open: false, content: null, stack: [] });
  }, []);

  return { ...state, openPanel, pushPanel, popPanel, closePanel };
}
