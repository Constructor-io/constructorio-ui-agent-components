import { useAgentRecommendations } from '@src/index';
import type { IAgentRecommendationsProps } from '@src/types';

/** A pod rendered from useAgentRecommendations. Its view and click events are left to the SDK. */
export default function HeadlessTemplate(args: IAgentRecommendationsProps) {
  const {
    title,
    products,
    refinementOptions,
    activeRefinement,
    refine,
    isLoading,
  } = useAgentRecommendations(args);

  if (isLoading && products.length === 0) return <p>Loading…</p>;
  if (products.length === 0) return null;

  return (
    <section aria-busy={isLoading}>
      <h2>{title}</h2>
      <ul>
        {products.map((product) => (
          <li key={product.url}>
            <a href={product.url}>{product.itemName}</a>
          </li>
        ))}
      </ul>
      {refinementOptions.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === activeRefinement}
          disabled={isLoading}
          onClick={() => refine(option)}
        >
          {option}
        </button>
      ))}
    </section>
  );
}
