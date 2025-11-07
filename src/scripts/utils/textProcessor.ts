/**
 * Text Processing Utilities
 *
 * Provides utility functions for analyzing and classifying text elements
 * including heading detection, body text classification, line height tracking,
 * and type scale analysis.
 */

import { TypeScaleAnalysis, LineHeightPattern } from '../types/extraction';

/**
 * Enhanced heading detection with multiple heuristics
 */
export function detectIfHeading(element: HTMLElement, fontSize: number, weight: number, text: string): boolean {
  const tagName = element.tagName.toLowerCase();

  // Don't classify buttons, links in nav, or form elements as headings
  if (tagName === 'button') return false;
  if (tagName === 'a' && element.closest('nav, header')) return false;
  if (tagName === 'label') return false;

  // Check visual hierarchy
  const isLargeAndBold = fontSize >= 18 && weight >= 600;
  const isVeryLarge = fontSize >= 24;
  const isExtraLarge = fontSize >= 32;

  // Check text characteristics
  const isShortText = text.length < 80; // Headings are typically short
  const isCapitalized = text.length > 0 && text[0] === text[0].toUpperCase();

  // Check semantic markers
  const hasHeadingClass = element.className.toLowerCase().match(/title|heading|headline|display/);

  // Combine heuristics
  if (isExtraLarge) return true; // Very large text is almost always a heading
  if (isVeryLarge && isShortText) return true;
  if (isLargeAndBold && isShortText && isCapitalized) return true;
  if (hasHeadingClass && fontSize >= 16) return true;

  return false;
}

/**
 * Enhanced body text classification
 */
export function classifyBodyText(element: HTMLElement, fontSize: number, weight: number): string {
  const tagName = element.tagName.toLowerCase();
  const className = element.className.toLowerCase();

  // UI Text (buttons, menus, nav)
  if (tagName === 'button' || element.getAttribute('role') === 'button') {
    return 'UI: Button text';
  }
  if (tagName === 'a' && element.closest('nav, header')) {
    return 'UI: Navigation';
  }
  if (className.includes('menu') || className.includes('dropdown')) {
    return 'UI: Menu items';
  }

  // Caption/Meta text (small text, usually under 13px)
  if (fontSize < 13 || tagName === 'small' || className.includes('caption')) {
    return 'Caption/Meta text';
  }
  if (tagName === 'figcaption') {
    return 'Caption: Figure caption';
  }
  if (className.includes('meta') || className.includes('timestamp')) {
    return 'Caption: Metadata';
  }

  // Label text
  if (tagName === 'label' || className.includes('label')) {
    return 'Label: Form label';
  }
  if (tagName === 'th') {
    return 'Label: Table header';
  }

  // Content text (paragraphs, articles)
  if (tagName === 'p') {
    return 'Content: Paragraph';
  }
  if (tagName === 'td' || tagName === 'li') {
    return 'Content: Body text';
  }
  if (element.closest('article, main, section')) {
    return 'Content: Article text';
  }

  // Link text
  if (tagName === 'a') {
    return 'Link text';
  }

  // Emphasis
  if (tagName === 'strong' || weight >= 600) {
    return 'Content: Emphasized text';
  }

  return 'Body text';
}

/**
 * Tracks line-height values for pattern analysis
 */
export function trackLineHeight(lineHeight: string, fontSize: number, lineHeightMap: Map<string, { count: number; fontSize: number[] }>): void {
  if (!lineHeight || lineHeight === 'normal') return;

  if (!lineHeightMap.has(lineHeight)) {
    lineHeightMap.set(lineHeight, { count: 0, fontSize: [] });
  }

  const entry = lineHeightMap.get(lineHeight)!;
  entry.count++;
  entry.fontSize.push(fontSize);
}

/**
 * Analyzes font sizes to detect type scale ratio
 */
export function analyzeTypeScale(fontSizes: number[]): TypeScaleAnalysis {
  if (fontSizes.length < 3) {
    return {
      baseSize: 16,
      ratio: 1,
      ratioName: 'Insufficient data',
      scale: [],
      confidence: 'low'
    };
  }

  // Get unique font sizes, sorted
  const uniqueSizes = Array.from(new Set(fontSizes)).sort((a, b) => a - b);

  // Detect base size (most common small-to-medium size)
  const baseCandidates = fontSizes.filter(s => s >= 12 && s <= 18);
  const baseSize = baseCandidates.length > 0
    ? Math.round(baseCandidates.reduce((a, b) => a + b) / baseCandidates.length)
    : 16;

  // Calculate ratios between consecutive sizes
  const ratios: number[] = [];
  for (let i = 1; i < uniqueSizes.length && i < 6; i++) {
    const ratio = uniqueSizes[i] / uniqueSizes[i - 1];
    if (ratio >= 1.1 && ratio <= 2.0) {
      ratios.push(ratio);
    }
  }

  // If we have ratios, calculate average
  const avgRatio = ratios.length > 0
    ? ratios.reduce((a, b) => a + b) / ratios.length
    : 1;

  // Identify common type scale ratios
  const commonRatios = [
    { value: 1.125, name: 'Major Second (1.125)' },
    { value: 1.2, name: 'Minor Third (1.2)' },
    { value: 1.25, name: 'Major Third (1.25)' },
    { value: 1.333, name: 'Perfect Fourth (1.333)' },
    { value: 1.414, name: 'Augmented Fourth (1.414)' },
    { value: 1.5, name: 'Perfect Fifth (1.5)' },
    { value: 1.618, name: 'Golden Ratio (1.618)' },
    { value: 2, name: 'Octave (2.0)' }
  ];

  // Find closest match
  let closestRatio = commonRatios[0];
  let minDiff = Math.abs(avgRatio - closestRatio.value);

  for (const ratio of commonRatios) {
    const diff = Math.abs(avgRatio - ratio.value);
    if (diff < minDiff) {
      minDiff = diff;
      closestRatio = ratio;
    }
  }

  // Determine confidence
  let confidence = 'low';
  if (minDiff < 0.05 && ratios.length >= 3) confidence = 'high';
  else if (minDiff < 0.1 && ratios.length >= 2) confidence = 'medium';

  return {
    baseSize,
    ratio: closestRatio.value,
    ratioName: closestRatio.name,
    scale: uniqueSizes.slice(0, 8),
    confidence
  };
}

/**
 * Analyzes line-height patterns
 */
export function analyzeLineHeightPatterns(lineHeightMap: Map<string, { count: number; fontSize: number[] }>): LineHeightPattern[] {
  const patterns: LineHeightPattern[] = [];

  for (const [value, data] of lineHeightMap.entries()) {
    // Calculate average ratio (line-height / font-size)
    const avgFontSize = data.fontSize.reduce((a, b) => a + b, 0) / data.fontSize.length;
    const lineHeightPx = parseFloat(value);
    const ratio = lineHeightPx / avgFontSize;

    // Determine usage category
    let usage = 'Body text';
    if (ratio <= 1.2) usage = 'Tight (headings)';
    else if (ratio >= 1.6) usage = 'Loose (content)';
    else if (ratio >= 1.4 && ratio < 1.6) usage = 'Normal (body)';

    patterns.push({
      value,
      ratio: Math.round(ratio * 100) / 100,
      count: data.count,
      usage
    });
  }

  // Sort by count (most common first)
  patterns.sort((a, b) => b.count - a.count);

  return patterns.slice(0, 5);
}

/**
 * Infer heading level from font size (for inferred headings)
 */
export function inferHeadingLevelFromSize(fontSize: number): string {
  if (fontSize >= 32) return 'h1';
  if (fontSize >= 24) return 'h2';
  if (fontSize >= 20) return 'h3';
  if (fontSize >= 18) return 'h4';
  if (fontSize >= 16) return 'h5';
  return 'h6';
}
