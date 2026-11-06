import { useEffect, useState } from 'react';

import type { IAgenticPromise } from '@src/types';

import { searchAgenticPromises } from './fixtures';

/**
 * The demo's search page: runs Constructor search for `search` and gives its `agentic_promises`,
 * or null until the search returns.
 */
export default function useDemoSearch(
  search: string
): IAgenticPromise[] | null {
  const [result, setResult] = useState<{
    search: string;
    promises: IAgenticPromise[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    searchAgenticPromises(search, controller.signal).then(
      (promises) => setResult({ search, promises }),
      () => setResult({ search, promises: [] })
    );
    return () => controller.abort();
  }, [search]);

  return result?.search === search ? result.promises : null;
}
