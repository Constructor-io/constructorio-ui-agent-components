import { useAgentOverview } from '@src/index';
import type { IAgentOverviewProps } from '@src/types';

export default function HeadlessTemplate(args: IAgentOverviewProps) {
  const {
    phase,
    categories,
    categoryDescription,
    sections,
    selectCategory,
    isLoading,
    error,
  } = useAgentOverview(args);

  if (error) return <p>Error: {error}</p>;
  if (isLoading) return <p>Loading...</p>;

  if (phase === 'categories') {
    return (
      <div>
        <p>{categoryDescription}</p>
        {categories.map((category) => (
          <button
            key={category.title}
            type="button"
            onClick={() => selectCategory(category)}
          >
            {category.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      {sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
          <ul>
            {section.products.map((product) => (
              <li key={product.url}>
                <a href={product.url}>{product.itemName}</a> ${product.price}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
