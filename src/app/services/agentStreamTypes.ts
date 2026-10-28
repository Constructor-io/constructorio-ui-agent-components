// The JS client (`@constructor-io/constructorio-client-javascript`) exports a generic
// `AgentStreamEvent` with `data: Record<string, unknown>`. These local types provide
// narrowed, discriminated-union shapes with typed `data` fields per event type,
// which are needed for type-safe consumption in our hooks and parser.
export interface AgentStreamGroupEvent {
  type: 'group';
  data: {
    title: string;
    description: string;
  };
}

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

export interface AgentStreamSearchResultEvent {
  type: 'search_result';
  data: {
    title?: string;
    text?: string;
    response?: {
      results: AgentStreamResultItem[];
    };
  };
}

export interface AgentStreamMessageEvent {
  type: 'message';
  data: {
    text: string;
  };
}

export type AgentStreamEvent =
  | AgentStreamGroupEvent
  | AgentStreamSearchResultEvent
  | AgentStreamMessageEvent;
