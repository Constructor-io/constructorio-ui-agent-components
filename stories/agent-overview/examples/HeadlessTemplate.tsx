import { ProductCarousel, useAgentOverview } from '@src/index';
import type { IAgentOverviewProps } from '@src/types';

/** The Custom UI guide's snippet, as a story. */
export default function HeadlessTemplate(args: IAgentOverviewProps) {
  const { status, message, sections, displayName } = useAgentOverview(args);

  if (status === 'loading') return <p>Loading…</p>;
  if (status !== 'streaming' && status !== 'done') return null;

  return (
    <div className="cio-agent-overview-root">
      <span>{displayName}</span>
      <p>{message}</p>
      <ProductCarousel
        products={sections.flatMap((section) => section.products)}
      />
    </div>
  );
}
