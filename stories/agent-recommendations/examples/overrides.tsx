import type { IAgentRecommendationsComponentOverrides } from '@src/types';

/** Shared by the ComponentOverrides stories and the guide's snippets. */
export const partOverrides: IAgentRecommendationsComponentOverrides = {
  title: {
    reactNode: ({ title }) => (
      <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontWeight: 400 }}>
        {title}
      </h2>
    ),
  },
  refinement: {
    reactNode: ({ options, activeRefinement, refine, isLoading }) => (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === activeRefinement}
            disabled={isLoading}
            onClick={() => refine(option)}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: '1px solid #1c1917',
              background: option === activeRefinement ? '#1c1917' : '#fff',
              color: option === activeRefinement ? '#fff' : '#1c1917',
              cursor: 'pointer',
            }}
          >
            {option}
          </button>
        ))}
      </div>
    ),
  },
};

export const rootOverride: IAgentRecommendationsComponentOverrides = {
  reactNode: ({
    title,
    products,
    refinementOptions,
    refine,
    trackProductClick,
    isLoading,
  }) => {
    if (isLoading && products.length === 0) return <p>Loading…</p>;
    return (
      <section>
        <h2>{title}</h2>
        <ul>
          {products.map((product, index) => (
            <li key={product.url}>
              <a
                href={product.url}
                onClick={() => trackProductClick(product, index)}
              >
                {product.itemName}
              </a>{' '}
              — ${product.price.toFixed(2)}
            </li>
          ))}
        </ul>
        {refinementOptions.map((option) => (
          <button key={option} type="button" onClick={() => refine(option)}>
            {option}
          </button>
        ))}
      </section>
    );
  },
};
