// cspell:ignore timespans Timespans -- the tracker API's own field name, viewTimespans
import { useCallback, useEffect, useRef } from 'react';

import type {
  TimeSpan,
  UseRecommendationsTrackingReturn,
} from './useRecommendationsTracking';

const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_VIEW_THRESHOLD = 0.5;

interface UseViewportTrackingProps {
  tracking: UseRecommendationsTrackingReturn;
  /** The refinement options on screen, sent as the view's questions. */
  options: string[];
  /** Whether the pod shows its title and products yet. A view is only recorded once it does. */
  hasContent: boolean;
  viewThreshold?: number;
}

/**
 * Observes the pod's root element: a view when it crosses `viewThreshold` with content, or when
 * content arrives while it is already in view; an out-of-view when it drops back below; and the time
 * spent in view, flushed as one batched event every 5 minutes, when the page is hidden and on unmount.
 *
 * Ported from constructorio-ui-pia's useViewportTracking, with the pod's content, not its questions,
 * deciding when a view counts: a pod can settle with products and no options.
 */
export default function useViewportTracking({
  tracking,
  options,
  hasContent,
  viewThreshold = DEFAULT_VIEW_THRESHOLD,
}: UseViewportTrackingProps): (node: HTMLElement | null) => void {
  const timespansRef = useRef<TimeSpan[]>([]);
  const entryTimeRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  const hasContentRef = useRef(hasContent);
  const trackingRef = useRef(tracking);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const contentJustArrived = !hasContentRef.current && hasContent;
    hasContentRef.current = hasContent;
    if (contentJustArrived && entryTimeRef.current) {
      trackingRef.current.trackView(optionsRef.current);
    }
  }, [hasContent]);

  // Stable: only reads refs.
  const flush = useCallback(() => {
    if (entryTimeRef.current) {
      timespansRef.current.push({
        start: entryTimeRef.current,
        end: new Date().toISOString(),
      });
      entryTimeRef.current = null;
    }
    if (timespansRef.current.length > 0 && hasContentRef.current) {
      trackingRef.current.trackViews(optionsRef.current, [
        ...timespansRef.current,
      ]);
      timespansRef.current = [];
    }
  }, []);

  const observe = useCallback(
    (element: HTMLElement) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            entryTimeRef.current = new Date().toISOString();
            if (hasContentRef.current) {
              trackingRef.current.trackView(optionsRef.current);
            }
          } else if (entryTimeRef.current) {
            timespansRef.current.push({
              start: entryTimeRef.current,
              end: new Date().toISOString(),
            });
            entryTimeRef.current = null;
            trackingRef.current.trackOutOfView();
          }
        },
        { threshold: viewThreshold }
      );
      observer.observe(element);

      const interval = setInterval(flush, FLUSH_INTERVAL_MS);
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') flush();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        observer.disconnect();
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        flush();
      };
    },
    [flush, viewThreshold]
  );

  const containerRef = useCallback(
    (node: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = node ? observe(node) : null;
    },
    [observe]
  );

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    []
  );

  return containerRef;
}
