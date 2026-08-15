import { useCallback, useRef } from 'react';

type ClickEvent = React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>;

/**
 * Wraps async click handlers so rapid repeat clicks are ignored without
 * swallowing the first intentional click (unlike a ref-lock set before await).
 */
export function useStableClick(handler: () => void | Promise<void>) {
  const busyRef = useRef(false);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  return useCallback((event?: ClickEvent) => {
    event?.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    Promise.resolve(handlerRef.current()).finally(() => {
      busyRef.current = false;
    });
  }, []);
}
