import type { AgentStreamResultItem } from '../app/services/agentStreamTypes';
import type { IProduct } from '../types';

/** Maps one agent result to a product card, or `null` when it has no name or image to show. */
export default function toProduct(
  item: AgentStreamResultItem
): IProduct | null {
  const itemName = typeof item.value === 'string' ? item.value.trim() : '';
  const imageUrl = item.data?.image_url ?? '';
  if (!itemName || !imageUrl) return null;
  return {
    itemName,
    imageUrl,
    price: item.data?.price ?? 0,
    url: item.data?.url ?? '',
  };
}
