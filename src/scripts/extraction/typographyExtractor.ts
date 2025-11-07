import type { TypographyAnalysis } from '../types/extraction';
import {
  detectIfHeading,
  classifyBodyText,
  trackLineHeight,
  analyzeTypeScale,
  analyzeLineHeightPatterns,
  inferHeadingLevelFromSize
} from '../utils/textProcessor';

/**
 * Extracts font family values from the page
 */
export function extractFonts(): string[] {
  const fonts = new Set<string>();
  const elements = document.querySelectorAll('*');
  const maxElements = Math.min(elements.length, 100);

  for (let i = 0; i < maxElements; i++) {
    const element = elements[i];
    const styles = window.getComputedStyle(element);
    const fontFamily = styles.fontFamily;

    if (fontFamily && fontFamily !== 'inherit') {
      fonts.add(fontFamily);
    }
  }

  return Array.from(fonts).slice(0, 10);
}

/**
 * Extracts comprehensive typography context including headings, body text, type scale, and line height patterns
 */
export function extractTypographyContext(): TypographyAnalysis {
  const headings: { [tag: string]: any } = {};
  const bodyMap = new Map<string, any>();
  const inferredHeadingsMap = new Map<string, any>();
  const allFontSizes: number[] = [];
  const lineHeightMap = new Map<string, { count: number; fontSize: number[] }>();

  // Extract semantic heading styles (h1-h6 tags)
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const elements = document.querySelectorAll(tag);
    if (elements.length === 0) return;

    const firstElement = elements[0] as HTMLElement;
    const styles = getComputedStyle(firstElement);
    const actualFontSize = parseFloat(styles.fontSize);

    allFontSizes.push(actualFontSize);
    trackLineHeight(styles.lineHeight, actualFontSize, lineHeightMap);

    headings[tag] = {
      fontSize: `${actualFontSize}px`,
      fontWeight: styles.fontWeight,
      lineHeight: styles.lineHeight,
      color: styles.color,
      usage: `${tag.toUpperCase()} headings`,
      examples: Array.from(elements).slice(0, 2).map(el =>
        el.textContent?.substring(0, 50) || ''
      ),
      tag,
      count: elements.length
    };
  });

  // Extract text styles from actual content-bearing elements
  // Scan more elements for comprehensive analysis
  const bodySelectors = 'p, span:not([class*="icon"]), div, a, button, label, li, td, th, figcaption, small, strong, em';
  const bodyElements = document.querySelectorAll(bodySelectors);
  const maxBodyElements = Math.min(bodyElements.length, 500); // Increased for better coverage

  for (let i = 0; i < maxBodyElements; i++) {
    const element = bodyElements[i] as HTMLElement;
    const text = element.textContent?.trim() || '';

    // Skip if no meaningful text
    if (text.length < 2 || text.length > 300) continue;

    // Filter out container elements
    const directText = Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent?.trim() || '')
      .join(' ')
      .trim();

    // Skip if it's mainly a container
    if (element.children.length > 2 && directText.length < 10) continue;

    // Skip if it contains structural elements
    const hasStructuralChildren = element.querySelector('div, section, article, aside, main') !== null;
    if (hasStructuralChildren && element.children.length > 0) continue;

    const styles = getComputedStyle(element);
    const actualFontSize = parseFloat(styles.fontSize);
    const weight = parseInt(styles.fontWeight);

    // Track all font sizes for scale detection
    allFontSizes.push(actualFontSize);
    trackLineHeight(styles.lineHeight, actualFontSize, lineHeightMap);

    // Use actual font size in signature
    const signature = `${actualFontSize}px-${weight}-${styles.lineHeight}`;

    // Enhanced heading detection with better heuristics
    const isHeading = detectIfHeading(element, actualFontSize, weight, text);

    if (isHeading) {
      // This looks like a heading - add to inferred headings
      const headingLevel = inferHeadingLevelFromSize(actualFontSize);
      const headingKey = `${headingLevel} (inferred)`;

      if (!inferredHeadingsMap.has(headingKey)) {
        const cleanText = text.replace(/\s+/g, ' ').substring(0, 50);

        inferredHeadingsMap.set(headingKey, {
          fontSize: `${actualFontSize}px`,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          usage: `${headingLevel} headings (inferred from ${actualFontSize}px text)`,
          examples: [cleanText + (text.length > 50 ? '...' : '')],
          tag: headingLevel,
          count: 1
        });
      } else {
        inferredHeadingsMap.get(headingKey)!.count++;
      }
    } else {
      // This is body text - classify with enhanced categories
      if (!bodyMap.has(signature)) {
        const usage = classifyBodyText(element, actualFontSize, weight);
        const cleanText = text.replace(/\s+/g, ' ').substring(0, 60);

        bodyMap.set(signature, {
          fontSize: `${actualFontSize}px`,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          usage,
          examples: [cleanText + (text.length > 60 ? '...' : '')],
          tag: element.tagName.toLowerCase(),
          count: 1
        });
      } else {
        // Increment count for existing signature
        const existing = bodyMap.get(signature)!;
        existing.count++;
      }
    }
  }

  // Merge inferred headings into the headings object
  for (const [key, heading] of inferredHeadingsMap.entries()) {
    headings[key] = heading;
  }

  // Sort body text by count (most common first)
  const sortedBody = Array.from(bodyMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Show top 8 for better coverage

  // Analyze type scale
  const typeScale = analyzeTypeScale(allFontSizes);

  // Analyze line-height patterns
  const lineHeightPatterns = analyzeLineHeightPatterns(lineHeightMap);

  return {
    headings,
    body: sortedBody,
    typeScale,
    lineHeightPatterns
  };
}
