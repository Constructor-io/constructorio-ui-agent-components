import { useAgentOverview } from '@src/index';
import type { IAgentOverviewProps } from '@src/types';

export default function HeadlessTemplate(args: IAgentOverviewProps) {
  const { status, message, sections } = useAgentOverview(args);

  if (status === 'loading') return <p>Loading…</p>;
  if (status !== 'streaming' && status !== 'done') return null;

  return (
    <section aria-label="AI Overview">
      <p>{message}</p>
      <ul>
        {sections.flatMap((section) =>
          section.products.map((product) => (
            <li key={product.url}>
              <a href={product.url}>{product.itemName}</a> ${product.price}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
