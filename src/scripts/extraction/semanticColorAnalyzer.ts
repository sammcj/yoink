/**
 * Semantic Color Analyzer
 *
 * Analyzes color usage patterns and generates semantic color tokens
 * with context about where and how colors are used.
 */

import { getCachedElements, getCachedComputedStyle } from '../utils/domCache';
import { normalizeColor } from '../utils/styleHelpers';

/**
 * Color usage context
 */
export interface ColorUsageContext {
  color: string;
  usageCount: number;
  usedFor: string[];
  semanticName?: string;
  cssVariable?: string;
}

/**
 * Semantic color tokens organized by purpose
 */
export interface SemanticColorTokens {
  backgrounds: Record<string, string>;
  text: Record<string, string>;
  borders: Record<string, string>;
  interactive: Record<string, string>;
}

/**
 * Complete semantic color analysis
 */
export interface SemanticColorAnalysis {
  semantic: SemanticColorTokens;
  rawWithContext: ColorUsageContext[];
}

/**
 * Analyzes where a color is used (backgrounds, text, borders)
 */
function analyzeColorUsage(color: string, elements: Element[]): string[] {
  const usedFor = new Set<string>();
  let bgCount = 0;
  let textCount = 0;
  let borderCount = 0;

  for (const el of elements) {
    const styles = getCachedComputedStyle(el);

    // Check background
    const bg = normalizeColor(styles.backgroundColor);
    if (bg === color) {
      bgCount++;
    }

    // Check text
    const text = normalizeColor(styles.color);
    if (text === color) {
      textCount++;
    }

    // Check borders
    const border = normalizeColor(styles.borderColor);
    if (border === color && styles.borderWidth !== '0px') {
      borderCount++;
    }
  }

  // Determine primary usage
  if (bgCount > textCount && bgCount > borderCount) {
    usedFor.add('backgrounds');
  } else if (textCount > bgCount && textCount > borderCount) {
    usedFor.add('text');
  } else if (borderCount > 0) {
    usedFor.add('borders');
  }

  // Add secondary usages
  if (bgCount > 0 && !usedFor.has('backgrounds')) usedFor.add('backgrounds');
  if (textCount > 0 && !usedFor.has('text')) usedFor.add('text');
  if (borderCount > 5) usedFor.add('dividers');

  return Array.from(usedFor);
}

/**
 * Generates a semantic name for a color based on its usage and characteristics
 */
function generateSemanticName(
  _color: string,
  usedFor: string[],
  brightness: number,
  _index: number
): string {
  // Determine primary usage
  const primaryUsage = usedFor[0] || 'surface';

  // Determine brightness level
  let brightnessLevel: string;
  if (brightness > 230) brightnessLevel = 'lightest';
  else if (brightness > 180) brightnessLevel = 'light';
  else if (brightness > 100) brightnessLevel = 'medium';
  else if (brightness > 50) brightnessLevel = 'dark';
  else brightnessLevel = 'darkest';

  // Generate semantic names based on usage
  if (primaryUsage === 'backgrounds') {
    if (brightness > 200) return 'bg-primary';
    if (brightness > 150) return 'bg-secondary';
    if (brightness > 100) return `bg-elevated`;
    return 'bg-surface';
  }

  if (primaryUsage === 'text') {
    if (brightness > 150) return 'text-primary';
    if (brightness > 100) return 'text-secondary';
    return 'text-muted';
  }

  if (primaryUsage === 'borders' || usedFor.includes('dividers')) {
    return 'border-default';
  }

  return `${primaryUsage}-${brightnessLevel}`;
}

/**
 * Calculates brightness of a color (0-255)
 */
function calculateBrightness(color: string): number {
  // Parse RGB values
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return 128; // Default middle brightness

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Use perceived brightness formula
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Clusters similar colors together
 */
function clusterSimilarColors(colors: Map<string, number>): Map<string, string[]> {
  const clusters = new Map<string, string[]>();
  const processed = new Set<string>();

  const colorArray = Array.from(colors.keys());

  for (const color of colorArray) {
    if (processed.has(color)) continue;

    const cluster: string[] = [color];
    processed.add(color);

    // Find similar colors (within 15 units in RGB space)
    for (const otherColor of colorArray) {
      if (processed.has(otherColor)) continue;

      const match1 = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      const match2 = otherColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);

      if (!match1 || !match2) continue;

      const r1 = parseInt(match1[1]);
      const g1 = parseInt(match1[2]);
      const b1 = parseInt(match1[3]);
      const r2 = parseInt(match2[1]);
      const g2 = parseInt(match2[2]);
      const b2 = parseInt(match2[3]);

      const distance = Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
      );

      if (distance < 15) {
        cluster.push(otherColor);
        processed.add(otherColor);
      }
    }

    // Use the most frequently used color as the cluster representative
    const sortedCluster = cluster.sort((a, b) => (colors.get(b) || 0) - (colors.get(a) || 0));
    clusters.set(sortedCluster[0], cluster);
  }

  return clusters;
}

/**
 * Maps CSS variables to colors
 */
function buildCSSVariableMap(cssVariables: any): Map<string, string> {
  const map = new Map<string, string>();

  if (!cssVariables) return map;

  for (const [varName, themes] of Object.entries(cssVariables)) {
    const value = (themes as any).light || (themes as any)[Object.keys(themes as any)[0]];
    if (!value) continue;

    // Check if it looks like a color
    if (
      value.startsWith('#') ||
      value.startsWith('rgb') ||
      value.startsWith('hsl')
    ) {
      const normalized = normalizeColor(value);
      map.set(normalized, varName);
    }
  }

  return map;
}

/**
 * Main function to analyze colors and generate semantic tokens
 */
export function analyzeSemanticColors(
  colorUsage: Map<string, number>,
  cssVariables?: any
): SemanticColorAnalysis {
  const elements = getCachedElements();
  const cssVarMap = buildCSSVariableMap(cssVariables);

  // Cluster similar colors
  const clusters = clusterSimilarColors(colorUsage);

  // Analyze each color cluster
  const colorContexts: ColorUsageContext[] = [];

  for (const [representative, cluster] of clusters.entries()) {
    // Sum up usage counts for the cluster
    const totalUsage = cluster.reduce((sum, color) => sum + (colorUsage.get(color) || 0), 0);

    // Analyze usage
    const usedFor = analyzeColorUsage(representative, Array.from(elements));
    const brightness = calculateBrightness(representative);

    // Check if there's a CSS variable for this color
    const cssVariable = cssVarMap.get(representative);

    colorContexts.push({
      color: representative,
      usageCount: totalUsage,
      usedFor,
      cssVariable,
      semanticName: generateSemanticName(representative, usedFor, brightness, colorContexts.length)
    });
  }

  // Sort by usage count
  colorContexts.sort((a, b) => b.usageCount - a.usageCount);

  // Generate semantic tokens
  const semantic: SemanticColorTokens = {
    backgrounds: {},
    text: {},
    borders: {},
    interactive: {}
  };

  // Assign top colors to semantic categories (only to PRIMARY usage to avoid duplicates)
  for (const context of colorContexts.slice(0, 15)) {
    const name = context.semanticName || 'unknown';
    const primaryUsage = context.usedFor[0]; // Only use primary usage

    if (primaryUsage === 'backgrounds') {
      semantic.backgrounds[name] = context.color;
    } else if (primaryUsage === 'text') {
      semantic.text[name] = context.color;
    } else if (primaryUsage === 'borders' || primaryUsage === 'dividers') {
      semantic.borders[name] = context.color;
    }
  }

  // Detect interactive colors (used in hover states, buttons, links)
  const buttons = document.querySelectorAll('button, [role="button"], a');
  const interactiveColors = new Map<string, number>();

  buttons.forEach(btn => {
    const styles = getCachedComputedStyle(btn);
    const bg = normalizeColor(styles.backgroundColor);
    if (bg && bg !== 'rgba(0, 0, 0, 0)') {
      interactiveColors.set(bg, (interactiveColors.get(bg) || 0) + 1);
    }
  });

  // Add top interactive colors to semantic tokens
  const sortedInteractive = Array.from(interactiveColors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  sortedInteractive.forEach(([colorValue, _], idx) => {
    const name = idx === 0 ? 'primary' : `interactive-${idx}`;
    semantic.interactive[name] = colorValue;
  });

  return {
    semantic,
    rawWithContext: colorContexts
  };
}
