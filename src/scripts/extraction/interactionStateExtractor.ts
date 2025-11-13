/**
 * Interaction State Extractor
 *
 * Extracts interactive states (hover, active, focus, disabled) from CSS
 * and captures transition/animation properties.
 */

import { getCachedComputedStyle } from '../utils/domCache';
import { normalizeColor } from '../utils/styleHelpers';

/**
 * State styles for a specific interaction
 */
export interface InteractionState {
  backgroundColor?: string;
  color?: string;
  opacity?: string;
  transform?: string;
  boxShadow?: string;
  borderColor?: string;
  outline?: string;
  transition?: string;
}

/**
 * Interaction states for a component type
 */
export interface ComponentInteractionStates {
  componentType: string;
  selector: string;
  count: number;
  states: {
    default?: InteractionState;
    hover?: InteractionState;
    active?: InteractionState;
    focus?: InteractionState;
    disabled?: InteractionState;
  };
}

/**
 * Global interaction timing configuration
 */
export interface InteractionTiming {
  defaultDuration: string;
  commonDurations: string[];
  defaultEasing: string;
  commonEasings: string[];
}

/**
 * Complete interaction patterns analysis
 */
export interface InteractionPatterns {
  timing: InteractionTiming;
  components: ComponentInteractionStates[];
}

/**
 * Extracts transition properties from an element
 */
function extractTransitionInfo(element: Element): string | undefined {
  const styles = getCachedComputedStyle(element);
  const transition = styles.transition;

  if (transition && transition !== 'none' && transition !== 'all 0s ease 0s') {
    return transition;
  }

  // Also check individual transition properties
  const duration = styles.transitionDuration;
  const property = styles.transitionProperty;
  const easing = styles.transitionTimingFunction;

  if (duration && duration !== '0s' && property && property !== 'none') {
    return `${property} ${duration} ${easing}`;
  }

  return undefined;
}

/**
 * Parses CSS stylesheets for pseudo-class rules
 */
function extractPseudoClassRules(): Map<string, any> {
  const pseudoRules = new Map<string, any>();

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      // Skip extension stylesheets
      if (sheet.href && (
        sheet.href.includes('chrome-extension://') ||
        sheet.href.includes('moz-extension://') ||
        sheet.href.includes('safari-extension://')
      )) {
        continue;
      }

      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];

        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;

          // Check for pseudo-class selectors
          if (selector.includes(':hover') || selector.includes(':focus') ||
              selector.includes(':active') || selector.includes(':disabled')) {

            const baseSelector = selector
              .replace(/:hover/g, '')
              .replace(/:focus/g, '')
              .replace(/:active/g, '')
              .replace(/:disabled/g, '')
              .trim();

            if (!pseudoRules.has(baseSelector)) {
              pseudoRules.set(baseSelector, {
                hover: {},
                focus: {},
                active: {},
                disabled: {}
              });
            }

            const state = pseudoRules.get(baseSelector);
            const style = rule.style;

            // Extract relevant properties
            const extractedProps: any = {};

            if (style.backgroundColor) extractedProps.backgroundColor = normalizeColor(style.backgroundColor);
            if (style.color) extractedProps.color = normalizeColor(style.color);
            if (style.opacity) extractedProps.opacity = style.opacity;
            if (style.transform) extractedProps.transform = style.transform;
            if (style.boxShadow) extractedProps.boxShadow = style.boxShadow;
            if (style.borderColor) extractedProps.borderColor = normalizeColor(style.borderColor);
            if (style.outline) extractedProps.outline = style.outline;
            if (style.transition) extractedProps.transition = style.transition;
            if (style.transitionDuration) extractedProps.transitionDuration = style.transitionDuration;
            if (style.transitionTimingFunction) extractedProps.transitionEasing = style.transitionTimingFunction;

            // Assign to appropriate state
            if (selector.includes(':hover')) {
              Object.assign(state.hover, extractedProps);
            }
            if (selector.includes(':focus')) {
              Object.assign(state.focus, extractedProps);
            }
            if (selector.includes(':active')) {
              Object.assign(state.active, extractedProps);
            }
            if (selector.includes(':disabled')) {
              Object.assign(state.disabled, extractedProps);
            }
          }
        }
      }
    } catch (error) {
      // CORS or access error - skip this stylesheet
      console.debug('Could not access stylesheet for interaction state extraction:', error);
    }
  }

  return pseudoRules;
}

/**
 * Extracts interaction states for a specific component type
 */
function extractComponentStates(
  componentType: string,
  selector: string,
  pseudoRules: Map<string, any>
): ComponentInteractionStates | null {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;

  // Get default state from first element
  const firstElement = elements[0];
  const defaultStyles = getCachedComputedStyle(firstElement);

  const defaultState: InteractionState = {
    backgroundColor: normalizeColor(defaultStyles.backgroundColor),
    color: normalizeColor(defaultStyles.color),
    opacity: defaultStyles.opacity,
  };

  const transition = extractTransitionInfo(firstElement);
  if (transition) defaultState.transition = transition;

  // Try to find matching pseudo-class rules
  const states: ComponentInteractionStates['states'] = {
    default: defaultState
  };

  // Check pseudo rules for matching selectors
  for (const [ruleSelector, ruleStates] of pseudoRules.entries()) {
    // Simple matching - check if rule selector matches our component selector
    if (ruleSelector.includes(componentType.toLowerCase()) ||
        selector.includes(ruleSelector)) {

      if (Object.keys(ruleStates.hover).length > 0) {
        states.hover = ruleStates.hover;
      }
      if (Object.keys(ruleStates.focus).length > 0) {
        states.focus = ruleStates.focus;
      }
      if (Object.keys(ruleStates.active).length > 0) {
        states.active = ruleStates.active;
      }
      if (Object.keys(ruleStates.disabled).length > 0) {
        states.disabled = ruleStates.disabled;
      }

      // If we found states, use them
      if (states.hover || states.focus || states.active) break;
    }
  }

  // Try to capture hover state by temporarily hovering (limited support)
  // This is a fallback if CSS rules weren't accessible
  if (!states.hover && typeof (firstElement as any).matches === 'function') {
    try {
      // Simulate hover by checking for common hover classes or data attributes
      const hoverIndicators = firstElement.querySelectorAll('[class*="hover"], [data-hover]');
      if (hoverIndicators.length > 0) {
        states.hover = {
          backgroundColor: 'detected-via-DOM',
          transition: defaultState.transition
        };
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return {
    componentType,
    selector,
    count: elements.length,
    states
  };
}

/**
 * Extracts timing configuration from all transitions on the page
 */
function extractInteractionTiming(): InteractionTiming {
  const durations = new Map<string, number>();
  const easings = new Map<string, number>();

  // Sample elements for transitions
  const elements = document.querySelectorAll('*');
  const sampleSize = Math.min(elements.length, 500);

  for (let i = 0; i < sampleSize; i++) {
    const element = elements[i];
    const styles = getCachedComputedStyle(element);

    const duration = styles.transitionDuration;
    if (duration && duration !== '0s') {
      durations.set(duration, (durations.get(duration) || 0) + 1);
    }

    const easing = styles.transitionTimingFunction;
    if (easing && easing !== 'ease') {
      easings.set(easing, (easings.get(easing) || 0) + 1);
    }
  }

  // Get most common values
  const sortedDurations = Array.from(durations.entries())
    .sort((a, b) => b[1] - a[1]);

  const sortedEasings = Array.from(easings.entries())
    .sort((a, b) => b[1] - a[1]);

  return {
    defaultDuration: sortedDurations[0]?.[0] || '150ms',
    commonDurations: sortedDurations.slice(0, 5).map(([d]) => d),
    defaultEasing: sortedEasings[0]?.[0] || 'ease',
    commonEasings: sortedEasings.slice(0, 3).map(([e]) => e)
  };
}

/**
 * Main function to extract interaction patterns
 */
export function extractInteractionPatterns(): InteractionPatterns {
  // Extract pseudo-class rules from CSS
  const pseudoRules = extractPseudoClassRules();

  // Extract states for common interactive components
  const componentTypes = [
    { type: 'button', selector: 'button, [role="button"]' },
    { type: 'link', selector: 'a[href]' },
    { type: 'input', selector: 'input, textarea' },
    { type: 'navigation-item', selector: 'nav a, [role="navigation"] a' },
    { type: 'card', selector: '[class*="card"]' },
    { type: 'table-row', selector: 'tr, [role="row"]' },
    { type: 'tab', selector: '[role="tab"]' },
    { type: 'menu-item', selector: '[role="menuitem"]' }
  ];

  const components: ComponentInteractionStates[] = [];

  for (const { type, selector } of componentTypes) {
    const componentStates = extractComponentStates(type, selector, pseudoRules);
    if (componentStates && componentStates.count > 0) {
      // Only include if we found actual states
      if (componentStates.states.hover || componentStates.states.focus || componentStates.states.active) {
        components.push(componentStates);
      }
    }
  }

  // Extract timing information
  const timing = extractInteractionTiming();

  return {
    timing,
    components
  };
}
