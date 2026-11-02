import React from 'react';

import ReactDOM from 'react-dom/client';

import CioAgentOverviewComponent from './app';
import type { IAgentOverviewProps } from './types';
import version from './version';

import './styles.css';

/**
 * Options for initializing the Agent Overview component.
 * @public
 */
export interface CioAgentOverviewInitOptions extends IAgentOverviewProps {
  /** CSS selector for the container element */
  selector: string;
  /** Whether to include default CSS styles (default: true) */
  includeCSS?: boolean;
}

/**
 * Standalone Constructor.io Agent Overview.
 * @public
 */
const CioAgentOverview = (() => {
  const instances = new Map<
    Element,
    {
      root: ReactDOM.Root;
      currentProps: IAgentOverviewProps;
    }
  >();

  function handleStylesheet(includeCSS: boolean): void {
    const styleId = 'cio-agent-overview-styles';
    const stylesheet = document.getElementById(
      styleId
    ) as HTMLStyleElement | null;
    if (stylesheet) {
      stylesheet.disabled = !includeCSS;
    }
  }

  return {
    /** Library version. */
    VERSION: version || '0.0.0',

    /**
     * Initializes and mounts the component.
     *
     * @param options - Configuration options
     * @returns The container element or undefined if failed
     *
     * @example
     * ```js
     * CioAgentOverview.init({
     *   selector: '#agent',
     *   apiKey: 'your-api-key',
     *   query: 'gift for my dad who loves grilling'
     * });
     * ```
     */
    init({
      selector,
      includeCSS = true,
      ...componentProps
    }: CioAgentOverviewInitOptions): Element | undefined {
      if (typeof document === 'undefined') {
        console.error('CioAgentOverview.init() requires a browser environment');
        return undefined;
      }

      const container = document.querySelector<HTMLElement>(selector);
      if (!container) {
        console.error(
          `CioAgentOverview.init(): Element not found for selector "${selector}"`
        );
        return undefined;
      }

      handleStylesheet(includeCSS);

      const existingInstance = instances.get(container);
      if (existingInstance) {
        existingInstance.root.unmount();
        instances.delete(container);
      }

      try {
        const root = ReactDOM.createRoot(container);
        instances.set(container, { root, currentProps: componentProps });

        root.render(
          <React.StrictMode>
            <CioAgentOverviewComponent {...componentProps} />
          </React.StrictMode>
        );

        return container;
      } catch (error) {
        console.error('CioAgentOverview.init(): Failed to render', error);
        return undefined;
      }
    },

    /**
     * Updates an existing instance with new props.
     *
     * @param selector - CSS selector of the container
     * @param newProps - Partial props to update
     *
     * @example
     * ```js
     * CioAgentOverview.update('#agent', {
     *   query: 'waterproof hiking boots'
     * });
     * ```
     */
    update(selector: string, newProps: Partial<IAgentOverviewProps>): void {
      if (typeof document === 'undefined') return;

      const container = document.querySelector<HTMLElement>(selector);
      if (!container) {
        console.error(
          `CioAgentOverview.update(): Element not found for selector "${selector}"`
        );
        return;
      }

      const instance = instances.get(container);
      if (!instance) {
        console.warn(
          `CioAgentOverview.update(): No instance found for selector "${selector}"`
        );
        return;
      }

      const mergedProps = { ...instance.currentProps, ...newProps };
      instance.currentProps = mergedProps;

      instance.root.render(
        <React.StrictMode>
          <CioAgentOverviewComponent {...mergedProps} />
        </React.StrictMode>
      );
    },

    /**
     * Destroys one or all instances.
     *
     * @param selector - Optional selector. If omitted, destroys all instances.
     *
     * @example
     * ```js
     * CioAgentOverview.destroy('#agent');  // Destroy specific
     * CioAgentOverview.destroy();          // Destroy all
     * ```
     */
    destroy(selector?: string): void {
      if (typeof document === 'undefined') return;

      if (selector) {
        const container = document.querySelector<HTMLElement>(selector);
        if (container) {
          const instance = instances.get(container);
          if (instance) {
            instance.root.unmount();
            instances.delete(container);
          }
        }
      } else {
        instances.forEach((instance) => instance.root.unmount());
        instances.clear();
      }
    },
  };
})();

export default CioAgentOverview;
