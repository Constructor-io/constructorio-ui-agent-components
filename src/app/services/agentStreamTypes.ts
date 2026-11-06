/** One product in an agent response's `results`. */
export interface AgentStreamResultItem {
  value?: string;
  data?: {
    id?: string;
    variation_id?: string;
    image_url?: string;
    url?: string;
    price?: number;
  };
}
