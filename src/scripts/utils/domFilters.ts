/**
 * DOM filtering utilities for extracting and analyzing DOM tree structures
 */

/**
 * Checks if an element is visible in the DOM
 */
export function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0';
}

/**
 * Checks if an element is in the current viewport with a buffer
 */
export function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < window.innerHeight + 100 && // +100px buffer
    rect.bottom > -100 &&
    rect.left < window.innerWidth + 100 &&
    rect.right > -100
  );
}

/**
 * Determines if an element should be skipped from DOM extraction
 * Skips script, style, and other non-visual elements
 */
export function shouldSkipElement(el: Element): boolean {
  const tagName = el.tagName.toLowerCase();
  // Skip script, style, and other non-visual elements
  return ['script', 'style', 'link', 'meta', 'noscript'].includes(tagName);
}

/**
 * Determines if a node should be pruned from the final DOM tree
 * Never prune semantic tags, interactive elements, or elements with text
 */
export function shouldPruneNode(node: any): boolean {
  // Never prune semantic tags, interactive elements, or elements with text
  if (node.text || node.href || node.src || node.placeholder || node.tableHeaders) return false;
  if (['nav', 'main', 'header', 'footer', 'section', 'article', 'aside'].includes(node.tag)) return false;
  if (['button', 'a', 'input', 'textarea', 'select', 'label'].includes(node.tag)) return false;

  // Keep if has meaningful styles (more than just display)
  if (node.styles && Object.keys(node.styles).length > 2) return false;

  // Keep if has layout role
  if (node.layout || node.dimensions) return false;

  // Prune empty divs/spans with minimal styles
  if ((node.tag === 'div' || node.tag === 'span') &&
      (!node.styles || Object.keys(node.styles).length <= 1) &&
      (!node.children || node.children.length === 0)) {
    return true;
  }

  return false;
}
