import { useEffect, useRef, useState } from 'react';

import type {
  IAgentOverviewProps,
  ICategory,
  IProduct,
  IRecommendationSection,
} from '@src/types';
import toProduct from '@src/utils/toProduct';

import { createAgentStream } from '../services/agentOverviewClient';
import { parseAgentStream } from '../services/agentStreamParser';
import type { AgentStreamSearchResultEvent } from '../services/agentStreamTypes';
type Phase = 'categories' | 'products';

interface CategoriesResult {
  categories: ICategory[];
  description: string;
}

function toProducts(event: AgentStreamSearchResultEvent): IProduct[] {
  return (event.data.response?.results ?? [])
    .map(toProduct)
    .filter((p): p is IProduct => p !== null);
}

function toCategory(event: AgentStreamSearchResultEvent): ICategory | null {
  const title =
    typeof event.data.title === 'string' ? event.data.title.trim() : '';
  const imageUrl = event.data.response?.results?.[0]?.data?.image_url ?? '';
  if (!title || !imageUrl) return null;
  return { title, imageUrl };
}

async function consumeCategories(
  props: Pick<
    IAgentOverviewProps,
    'apiKey' | 'cioJsClient' | 'intent' | 'domains'
  >,
  abortRef: React.RefObject<boolean>
): Promise<CategoriesResult> {
  const minDelay = new Promise((resolve) => setTimeout(resolve, 1000));

  const rawStream = createAgentStream(
    { apiKey: props.apiKey, cioJsClient: props.cioJsClient },
    props.intent,
    props.domains.suggestions
  );
  const events = parseAgentStream(rawStream);
  const categories: ICategory[] = [];
  let description = '';

  for await (const event of events) {
    if (abortRef.current) break;

    if (event.type === 'message') {
      description = event.data.text;
    } else if (event.type === 'search_result') {
      const category = toCategory(event);
      if (category) categories.push(category);
    }
  }

  await minDelay;
  return { categories, description };
}

async function consumeProducts(
  props: Pick<
    IAgentOverviewProps,
    'apiKey' | 'cioJsClient' | 'intent' | 'domains'
  >,
  abortRef: React.RefObject<boolean>,
  onSection: (section: IRecommendationSection) => void
): Promise<{ error: string | null }> {
  const rawStream = createAgentStream(
    { apiKey: props.apiKey, cioJsClient: props.cioJsClient },
    props.intent,
    props.domains.results
  );
  const events = parseAgentStream(rawStream);

  let currentTitle = '';
  let currentDescription = '';
  let currentProducts: IProduct[] = [];

  function flushSection() {
    if (currentProducts.length > 0) {
      onSection({
        title: currentTitle,
        description: currentDescription,
        products: [...currentProducts],
      });
    }
    currentTitle = '';
    currentProducts = [];
  }

  for await (const event of events) {
    if (abortRef.current) break;

    if (event.type === 'message') {
      currentDescription = event.data.text;
    } else if (event.type === 'group') {
      flushSection();
      currentTitle = event.data.title;
      currentDescription = event.data.description;
    } else if (event.type === 'search_result') {
      const products = toProducts(event);
      if (event.data.title) {
        flushSection();
        currentTitle = event.data.title;
      }
      currentProducts.push(...products);
    }
  }
  flushSection();

  return { error: null };
}

/**
 * Hook that manages the full Agent Overview lifecycle: streaming categories,
 * handling user selection, and streaming product recommendation sections.
 *
 * @example
 * ```tsx
 * const { phase, categories, sections, selectCategory, isLoading, error } =
 *   useAgentOverview({ apiKey: 'YOUR_API_KEY', intent: 'I want to buy shoes', domains });
 * ```
 */
export default function useAgentOverview(props: IAgentOverviewProps): {
  phase: Phase;
  categories: ICategory[];
  categoryDescription: string;
  sections: IRecommendationSection[];
  selectCategory: (category: ICategory) => void;
  isLoading: boolean;
  error: string | null;
} {
  const { apiKey, cioJsClient, intent, domains } = props;
  const [phase, setPhase] = useState<Phase>('categories');
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [categoryDescription, setCategoryDescription] = useState('');
  const [sections, setSections] = useState<IRecommendationSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef(false);
  const phaseRef = useRef<Phase>('categories');
  const bufferedSectionsRef = useRef<IRecommendationSection[]>([]);
  const productsDoneRef = useRef(false);
  const productsErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!intent || !domains?.suggestions || !domains?.results) return;

    abortRef.current = false;
    phaseRef.current = 'categories';
    bufferedSectionsRef.current = [];
    productsDoneRef.current = false;
    productsErrorRef.current = null;

    function resetAndFetch() {
      setPhase('categories');
      setIsLoading(true);
      setError(null);
      setCategories([]);
      setCategoryDescription('');
      setSections([]);

      consumeCategories({ apiKey, cioJsClient, intent, domains }, abortRef)
        .then((result) => {
          if (abortRef.current) return;
          setCategoryDescription(result.description);
          setCategories(result.categories);
        })
        .catch((err: unknown) => {
          if (!abortRef.current) {
            setError(
              err instanceof Error ? err.message : 'Failed to load categories'
            );
          }
        })
        .finally(() => setIsLoading(false));

      consumeProducts(
        { apiKey, cioJsClient, intent, domains },
        abortRef,
        (section) => {
          if (abortRef.current) return;
          if (phaseRef.current === 'products') {
            setSections((prev) => [...prev, section]);
          } else {
            bufferedSectionsRef.current.push(section);
          }
        }
      )
        .then((result) => {
          productsDoneRef.current = true;
          productsErrorRef.current = result.error;
        })
        .catch((err: unknown) => {
          productsDoneRef.current = true;
          productsErrorRef.current =
            err instanceof Error ? err.message : 'Failed to load results';
        });
    }

    resetAndFetch();

    return () => {
      abortRef.current = true;
    };
  }, [apiKey, cioJsClient, intent, domains]);

  function selectCategory(_category: ICategory) {
    setPhase('products');
    phaseRef.current = 'products';
    setError(null);

    // Flush any sections that arrived while in categories phase
    if (bufferedSectionsRef.current.length > 0) {
      setSections(bufferedSectionsRef.current);
      bufferedSectionsRef.current = [];
    }

    if (productsDoneRef.current) {
      if (productsErrorRef.current) {
        setError(productsErrorRef.current);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const interval = setInterval(() => {
      if (!productsDoneRef.current) return;

      clearInterval(interval);
      if (productsErrorRef.current) {
        setError(productsErrorRef.current);
      }
      setIsLoading(false);
    }, 100);
  }

  return {
    phase,
    categories,
    categoryDescription,
    sections,
    selectCategory,
    isLoading,
    error,
  };
}
