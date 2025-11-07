/**
 * Style Extractor Module
 *
 * Extracts design system styles from web pages:
 * - CSS Custom Properties with theme variants
 * - Colors with usage tracking
 * - Box shadows with elevation levels
 * - Border radius values
 */

import type { ParsedShadow, ShadowGroup, ShadowSystem } from '../types/extraction';
import { getThemeFromSelector, normalizeColor } from '../utils/styleHelpers';

/**
 * Extracts CSS Custom Properties from stylesheets
 * Handles theme variants like :root, .dark, [data-theme="dark"]
 */
export function extractCSSCustomProperties(): any {
  const cssVars: any = {};
  const stylesheets = document.styleSheets;

  for (let i = 0; i < stylesheets.length; i++) {
    try {
      const stylesheet = stylesheets[i];

      // Skip browser extension stylesheets
      if (stylesheet.href && (
        stylesheet.href.includes('chrome-extension://') ||
        stylesheet.href.includes('moz-extension://') ||
        stylesheet.href.includes('safari-extension://')
      )) {
        continue;
      }

      let rules: CSSRuleList | null = null;
      try {
        rules = stylesheet.cssRules || stylesheet.rules;
      } catch {
        continue; // CORS blocked
      }

      if (!rules || rules.length === 0) continue;

      parseCSSRules(rules, cssVars);
    } catch {
      // Silent fail - continue to next sheet
    }
  }

  // Fallback: Read from getComputedStyle if no variables found
  if (Object.keys(cssVars).length === 0) {
    extractComputedVariables(cssVars);
  }

  filterExtensionVariables(cssVars);
  return cssVars;
}

/**
 * Extract CSS variables using getComputedStyle fallback
 */
export function extractComputedVariables(cssVars: any): void {
  const rootStyles = getComputedStyle(document.documentElement);

  // Extract light mode
  for (let i = 0; i < rootStyles.length; i++) {
    const prop = rootStyles[i];
    if (prop.startsWith('--')) {
      const value = rootStyles.getPropertyValue(prop).trim();
      if (value) {
        cssVars[prop] = { light: value };
      }
    }
  }

  // Try dark mode detection
  const hadDarkClass = document.documentElement.classList.contains('dark');
  const hadDataTheme = document.documentElement.getAttribute('data-theme');

  document.documentElement.classList.add('dark');
  const darkStyles = getComputedStyle(document.documentElement);

  for (let i = 0; i < darkStyles.length; i++) {
    const prop = darkStyles[i];
    if (prop.startsWith('--')) {
      const value = darkStyles.getPropertyValue(prop).trim();
      if (value && cssVars[prop] && cssVars[prop].light !== value) {
        cssVars[prop].dark = value;
      } else if (value && !cssVars[prop]) {
        cssVars[prop] = { dark: value };
      }
    }
  }

  // Restore original state
  if (!hadDarkClass) {
    document.documentElement.classList.remove('dark');
  }
  if (hadDataTheme !== null) {
    document.documentElement.setAttribute('data-theme', hadDataTheme);
  }
}

/**
 * Filters out browser extension and utility CSS variables
 */
export function filterExtensionVariables(cssVars: any): void {
  const extensionPatterns = [
    'vimium-', 'arc-', 'extension-', 'grammarly-', 'lastpass-'
  ];

  const tailwindUtilityPatterns = [
    'container-', 'text-', 'blur-', 'font-weight-', 'font-size-',
    'tracking-', 'leading-', 'animate-', 'ease-', 'default-',
    'spacing-', 'line-height-', 'letter-spacing-', 'prose-',
    'screen-', 'breakpoint-', 'duration-', 'delay-', 'scale-',
    'rotate-', 'translate-', 'skew-'
  ];

  const utilityExactNames = ['spacing', 'default', 'none', 'auto', 'full', 'screen'];

  for (const varName in cssVars) {
    const cleanName = varName.replace('--', '').toLowerCase();

    if (extensionPatterns.some(pattern => cleanName.startsWith(pattern))) {
      delete cssVars[varName];
      continue;
    }

    if (tailwindUtilityPatterns.some(pattern => cleanName.startsWith(pattern))) {
      delete cssVars[varName];
      continue;
    }

    if (utilityExactNames.includes(cleanName)) {
      delete cssVars[varName];
    }
  }
}

/**
 * Recursively parse CSS rules to find custom properties
 */
export function parseCSSRules(rules: CSSRuleList, cssVars: any): void {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    // Handle nested rules (@media, @supports)
    if ('cssRules' in rule && rule.cssRules) {
      parseCSSRules(rule.cssRules as CSSRuleList, cssVars);
      continue;
    }

    if (!('style' in rule)) continue;

    const selector = 'selectorText' in rule ? (rule as CSSStyleRule).selectorText : '';
    if (!selector) continue;

    // Only extract from theme selectors
    const isThemeSelector = (
      selector === ':root' ||
      selector === 'html' ||
      selector === 'body' ||
      selector.includes('.dark') ||
      selector.includes('[data-theme') ||
      selector.includes(':host')
    );

    if (!isThemeSelector) continue;

    const theme = getThemeFromSelector(selector);
    const style = rule.style as CSSStyleDeclaration;

    for (let j = 0; j < style.length; j++) {
      const property = style[j];
      if (property.startsWith('--')) {
        const value = style.getPropertyValue(property).trim();
        if (!cssVars[property]) {
          cssVars[property] = {};
        }
        cssVars[property][theme] = value;
      }
    }
  }
}

/**
 * Extracts colors from page with usage tracking
 */
export function extractColors(): { colors: string[]; usage: any } {
  const colorUsage = new Map<string, number>();
  const elements = document.querySelectorAll('*');
  const maxElements = Math.min(elements.length, 200);

  for (let i = 0; i < maxElements; i++) {
    const element = elements[i];
    const styles = window.getComputedStyle(element);

    // Background colors
    const bgColor = styles.backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      const normalized = normalizeColor(bgColor);
      colorUsage.set(normalized, (colorUsage.get(normalized) || 0) + 1);
    }

    // Text colors
    const textColor = styles.color;
    if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
      const normalized = normalizeColor(textColor);
      colorUsage.set(normalized, (colorUsage.get(normalized) || 0) + 1);
    }

    // Border colors
    const borderColor = styles.borderColor;
    if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
      const normalized = normalizeColor(borderColor);
      colorUsage.set(normalized, (colorUsage.get(normalized) || 0) + 1);
    }
  }

  const sortedColors = Array.from(colorUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return {
    colors: sortedColors.map(([color]) => color),
    usage: Object.fromEntries(sortedColors)
  };
}

/**
 * Extracts border radius values
 */
export function extractBorderRadius(): string[] {
  const radiusValues = new Set<string>();
  const elements = document.querySelectorAll('*');
  const maxElements = Math.min(elements.length, 100);

  for (let i = 0; i < maxElements; i++) {
    const element = elements[i];
    const styles = window.getComputedStyle(element);
    const borderRadius = styles.borderRadius;

    if (borderRadius && borderRadius !== '0px') {
      const pixels = parseFloat(borderRadius);

      // Filter out percentage-based and absurd values
      if (borderRadius.includes('%')) continue;
      if (pixels > 0 && pixels <= 100) {
        radiusValues.add(borderRadius);
      }
    }
  }

  return Array.from(radiusValues).slice(0, 10);
}

/**
 * Extracts and analyzes box shadow values with elevation levels
 */
export function extractShadows(): ShadowSystem {
  const shadowUsage = new Map<string, number>();
  const elements = document.querySelectorAll('*');
  const maxElements = Math.min(elements.length, 500);

  // Collect all shadows with usage counts
  for (let i = 0; i < maxElements; i++) {
    const element = elements[i];
    const styles = window.getComputedStyle(element);
    const boxShadow = styles.boxShadow;

    if (boxShadow && boxShadow !== 'none') {
      shadowUsage.set(boxShadow, (shadowUsage.get(boxShadow) || 0) + 1);
    }
  }

  // Parse all unique shadows
  const parsedShadows: Array<{ parsed: ParsedShadow; count: number }> = [];
  for (const [shadowStr, count] of shadowUsage.entries()) {
    const parsed = parseShadow(shadowStr);
    if (parsed) {
      parsedShadows.push({ parsed, count });
    }
  }

  // Group similar shadows and assign elevation levels
  const shadowGroups = groupShadowsByElevation(parsedShadows);

  // Detect pattern (Material Design, custom, etc.)
  const pattern = detectShadowPattern(shadowGroups);

  return {
    elevationLevels: shadowGroups,
    pattern,
    totalUniqueShadows: shadowUsage.size
  };
}

/**
 * Parses a CSS box-shadow string into structured data
 * Handles both single and multiple shadows (comma-separated)
 */
export function parseShadow(shadowStr: string): ParsedShadow | null {
  if (!shadowStr || shadowStr === 'none') return null;

  // For multiple shadows, take the most prominent one (first non-inset)
  const shadows = shadowStr.split(/,(?![^(]*\))/);

  for (const shadow of shadows) {
    const trimmed = shadow.trim();

    // Check for inset
    const inset = trimmed.startsWith('inset');
    const cleanShadow = trimmed.replace(/^inset\s+/, '');

    // Parse shadow components: offsetX offsetY blur spread color
    // Match patterns like: "0px 2px 8px 0px rgba(0, 0, 0, 0.1)"
    const regex = /([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px(?:\s+([-\d.]+)px)?\s+(.+)/;
    const match = cleanShadow.match(regex);

    if (match) {
      const [, offsetX, offsetY, blur, spread, color] = match;

      return {
        offsetX: parseFloat(offsetX),
        offsetY: parseFloat(offsetY),
        blur: parseFloat(blur),
        spread: spread ? parseFloat(spread) : 0,
        color: color.trim(),
        inset,
        raw: shadowStr
      };
    }
  }

  return null;
}

/**
 * Calculates shadow intensity for grouping and sorting
 * Higher blur and offset = higher intensity
 */
export function calculateShadowIntensity(shadow: ParsedShadow): number {
  // Blur is the primary factor for elevation
  const blurWeight = shadow.blur * 3;

  // Y offset is secondary (shadows usually go down)
  const offsetWeight = Math.abs(shadow.offsetY) * 1.5;

  // Spread adds subtle depth
  const spreadWeight = Math.abs(shadow.spread) * 0.5;

  return blurWeight + offsetWeight + spreadWeight;
}

/**
 * Merges visually similar shadows within a group
 */
function mergeSimilarShadows(
  shadows: Array<{ parsed: ParsedShadow; count: number; intensity: number }>
): Array<{ parsed: ParsedShadow; count: number; intensity: number }> {
  if (shadows.length <= 1) return shadows;

  const merged: Array<{ parsed: ParsedShadow; count: number; intensity: number }> = [];
  const used = new Set<number>();

  for (let i = 0; i < shadows.length; i++) {
    if (used.has(i)) continue;

    const current = shadows[i];
    let totalCount = current.count;

    // Find similar shadows
    for (let j = i + 1; j < shadows.length; j++) {
      if (used.has(j)) continue;

      const other = shadows[j];

      // Check if shadows are similar (within 20% intensity difference)
      const intensityDiff = Math.abs(current.intensity - other.intensity);
      const avgIntensity = (current.intensity + other.intensity) / 2;

      if (intensityDiff / avgIntensity < 0.2) {
        totalCount += other.count;
        used.add(j);
      }
    }

    merged.push({
      parsed: current.parsed,
      count: totalCount,
      intensity: current.intensity
    });
    used.add(i);
  }

  return merged;
}

/**
 * Groups shadows by elevation level (0-5)
 */
export function groupShadowsByElevation(
  shadows: Array<{ parsed: ParsedShadow; count: number }>
): ShadowGroup[] {
  if (shadows.length === 0) {
    return [];
  }

  // Calculate intensity for each shadow
  const shadowsWithIntensity = shadows.map(({ parsed, count }) => ({
    parsed,
    count,
    intensity: calculateShadowIntensity(parsed)
  }));

  // Sort by intensity
  shadowsWithIntensity.sort((a, b) => a.intensity - b.intensity);

  // Define elevation levels based on intensity ranges
  const elevationRanges = [
    { level: 0, name: 'None', min: 0, max: 5 },
    { level: 1, name: 'Subtle', min: 5, max: 25 },
    { level: 2, name: 'Moderate', min: 25, max: 50 },
    { level: 3, name: 'Strong', min: 50, max: 80 },
    { level: 4, name: 'Heavy', min: 80, max: 120 },
    { level: 5, name: 'Extra Heavy', min: 120, max: Infinity }
  ];

  // Group shadows into elevation levels
  const groups: ShadowGroup[] = [];

  for (const range of elevationRanges) {
    const shadowsInRange = shadowsWithIntensity.filter(
      s => s.intensity >= range.min && s.intensity < range.max
    );

    if (shadowsInRange.length > 0) {
      // Merge similar shadows within the same elevation level
      const merged = mergeSimilarShadows(shadowsInRange);

      if (merged.length > 0) {
        // Pick the most common shadow as representative
        merged.sort((a, b) => b.count - a.count);
        const representative = merged[0].parsed;

        groups.push({
          shadows: merged.map(s => s.parsed),
          elevationLevel: range.level,
          name: range.name,
          count: merged.reduce((sum, s) => sum + s.count, 0),
          intensity: merged[0].intensity,
          representative: representative.raw
        });
      }
    }
  }

  return groups;
}

/**
 * Detects shadow system pattern (Material Design, custom, etc.)
 */
export function detectShadowPattern(groups: ShadowGroup[]): string {
  if (groups.length === 0) return 'No shadows detected';
  if (groups.length === 1) return 'Single shadow style';

  // Check for Material Design pattern
  // Material uses specific elevation levels with predictable blur/offset ratios
  const hasMaterialPattern = groups.some(g => {
    const shadow = g.shadows[0];
    // Material Design shadows typically have blur/offsetY ratio around 2-3
    const ratio = shadow.blur / Math.abs(shadow.offsetY || 1);
    return ratio >= 1.5 && ratio <= 4 && shadow.offsetY > 0;
  });

  if (hasMaterialPattern && groups.length >= 3) {
    return 'Material Design inspired (elevation-based)';
  }

  // Check for geometric progression
  if (groups.length >= 3) {
    const intensities = groups.map(g => g.intensity);
    const ratios: number[] = [];

    for (let i = 1; i < intensities.length; i++) {
      ratios.push(intensities[i] / intensities[i - 1]);
    }

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    if (avgRatio >= 1.4 && avgRatio <= 2.5) {
      return `Custom scale (~${avgRatio.toFixed(1)}x progression)`;
    }
  }

  return `Custom shadow system (${groups.length} levels)`;
}
