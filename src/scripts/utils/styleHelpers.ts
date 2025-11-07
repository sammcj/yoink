/**
 * Style Helper Functions
 * Collection of utility functions for style extraction and CSS manipulation
 */

/**
 * Convert OKLAB to Linear RGB
 */
export function oklabToLinearRGB(L: number, a: number, b: number): { r: number; g: number; b: number } {
  // OKLAB to LMS
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.2914855480 * b;

  // LMS to Linear RGB
  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b2 = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return { r, g: g, b: b2 };
}

/**
 * Convert Linear RGB to sRGB (gamma correction)
 */
export function linearRGBToSRGB(linear: number): number {
  if (linear <= 0.0031308) {
    return 12.92 * linear;
  } else {
    return 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  }
}

/**
 * Parse OKLCH color format: oklch(L C H) or oklch(L C H / alpha)
 */
export function parseOKLCH(color: string): { r: number; g: number; b: number } | null {
  const match = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!match) return null;

  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);

  // OKLCH to OKLAB
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLAB to Linear RGB
  const linearRGB = oklabToLinearRGB(L, a, b);

  // Linear RGB to sRGB
  const r = Math.round(Math.max(0, Math.min(255, linearRGBToSRGB(linearRGB.r) * 255)));
  const g = Math.round(Math.max(0, Math.min(255, linearRGBToSRGB(linearRGB.g) * 255)));
  const b2 = Math.round(Math.max(0, Math.min(255, linearRGBToSRGB(linearRGB.b) * 255)));

  return { r, g, b: b2 };
}

/**
 * Parse OKLAB color format: oklab(L a b) or oklab(L a b / alpha)
 */
export function parseOKLAB(color: string): { r: number; g: number; b: number } | null {
  const match = color.match(/oklab\(([\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
  if (!match) return null;

  const L = parseFloat(match[1]);
  const a = parseFloat(match[2]);
  const b = parseFloat(match[3]);

  // OKLAB to Linear RGB
  const linearRGB = oklabToLinearRGB(L, a, b);

  // Linear RGB to sRGB
  const r = Math.round(Math.max(0, Math.min(255, linearRGBToSRGB(linearRGB.r) * 255)));
  const g = Math.round(Math.max(0, Math.min(255, linearRGBToSRGB(linearRGB.g) * 255)));
  const b2 = Math.round(Math.max(0, Math.min(255, linearRGBToSRGB(linearRGB.b) * 255)));

  return { r, g, b: b2 };
}

/**
 * Converts a color string (rgb, rgba, hex, oklch, oklab, hsl, etc.) to RGB components
 * Uses browser's color computation for formats like oklch/oklab that require complex conversion
 */
export function parseColorToRGB(color: string): { r: number; g: number; b: number } | null {
  // Handle rgb/rgba
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3])
    };
  }

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }
  }

  // Handle transparent
  if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return { r: 0, g: 0, b: 0 };
  }

  // Handle OKLCH manually
  if (color.includes('oklch')) {
    const result = parseOKLCH(color);
    if (result) {
      return result;
    }
  }

  // Handle OKLAB manually
  if (color.includes('oklab')) {
    const result = parseOKLAB(color);
    if (result) {
      return result;
    }
  }

  // Handle hsl and other CSS color formats - try browser conversion
  if (color.includes('hsl') || color.includes('lab')) {
    try {
      // Try Method 1: Use canvas fillStyle (most reliable for color conversion)
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = color;
          const computedStyle = ctx.fillStyle;

          // Check if it was actually converted
          if (computedStyle !== color && computedStyle.startsWith('#')) {
            // Canvas returns hex, parse it
            return parseColorToRGB(computedStyle);
          }
        }
      } catch (e) {
        // Canvas method failed, continue to DOM method
      }

      // Try Method 2: Use DOM element with color property
      const tempDiv = document.createElement('div');
      tempDiv.style.display = 'none';
      tempDiv.style.color = color;
      document.body.appendChild(tempDiv);

      const computed = getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);

      // Check if browser actually converted the color (prevent infinite recursion)
      if (computed === color) {
        return null;
      }

      // Recursively parse the computed rgb value
      return parseColorToRGB(computed);
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Calculates color distance using Euclidean distance in RGB space
 * Returns a value between 0 (identical) and 1 (very different)
 * Normalized by dividing by maximum possible distance (441.67)
 */
export function calculateColorDistance(color1: string, color2: string): number {
  const rgb1 = parseColorToRGB(color1);
  const rgb2 = parseColorToRGB(color2);

  if (!rgb1 || !rgb2) {
    // If we can't parse, consider them different
    return color1 === color2 ? 0 : 1;
  }

  // Calculate Euclidean distance in RGB space
  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;

  const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);

  // Normalize to 0-1 (max distance is sqrt(255^2 + 255^2 + 255^2) ≈ 441.67)
  return distance / 441.67;
}

/**
 * Identifies theme variant from CSS selector
 */
export function getThemeFromSelector(selector: string): string {
  const lower = selector.toLowerCase();

  if (lower.includes('.dark') ||
      lower.includes('[data-theme="dark"]') ||
      lower.includes('[data-theme=\'dark\']') ||
      lower.includes('[theme="dark"]') ||
      lower.includes('.theme-dark')) {
    return 'dark';
  }

  return 'light';
}

/**
 * Normalizes color to rgb() format
 */
export function normalizeColor(color: string): string {
  if (color.startsWith('#')) return color;

  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const alpha = a !== undefined ? parseFloat(a) : 1;

    if (alpha === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

/**
 * Gets clean HTML representation of element for analysis
 */
export function getCleanHTML(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;

  // Simplify deeply nested elements
  if (clone.children.length > 3) {
    const textContent = clone.textContent?.trim().substring(0, 40) || '';
    clone.innerHTML = textContent + (textContent.length >= 40 ? '...' : '');
  } else if (clone.children.length > 0) {
    // Keep simple children but limit their content
    Array.from(clone.children).forEach((child, idx) => {
      if (idx > 2) {
        child.remove();
      } else if (child.children.length > 0) {
        const text = child.textContent?.trim().substring(0, 30) || '';
        child.innerHTML = text;
      }
    });
  }

  let html = clone.outerHTML;

  // Ensure it's under 400 chars
  if (html.length > 400) {
    const openingTag = html.match(/^<[^>]+>/)?.[0] || '';
    const closingTag = html.match(/<\/[^>]+>$/)?.[0] || '';
    const tagName = element.tagName.toLowerCase();

    if (openingTag && closingTag) {
      const content = clone.textContent?.trim().substring(0, 30) || '';
      html = `${openingTag}${content}...${closingTag}`;
    } else {
      html = `<${tagName} class="${element.className.substring(0, 100)}">${clone.textContent?.substring(0, 30) || ''}...</${tagName}>`;
    }
  }

  return html;
}

/**
 * Gets matching CSS rules for an element
 */
export function getMatchingCSSRules(element: HTMLElement): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];

  try {
    const sheets = Array.from(document.styleSheets);

    sheets.forEach(sheet => {
      try {
        const cssRules = Array.from(sheet.cssRules || sheet.rules || []);

        cssRules.forEach(rule => {
          if (rule instanceof CSSStyleRule) {
            const selectorText = rule.selectorText;

            // Check if selector matches this element (ignoring pseudo-classes for matching)
            const baseSelector = selectorText.replace(/:(hover|focus|active|disabled|visited|checked)/g, '');

            try {
              if (element.matches(baseSelector)) {
                // Include rules with pseudo-classes
                if (selectorText.includes(':hover') ||
                    selectorText.includes(':focus') ||
                    selectorText.includes(':active') ||
                    selectorText.includes(':disabled')) {
                  rules.push(rule);
                }
              }
            } catch (e) {
              // Invalid selector, skip
            }
          }
        });
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    });
  } catch (e) {
    // Error accessing stylesheets
  }

  return rules;
}

/**
 * Parses padding value string and returns the first value as a number
 */
export function parsePaddingValue(padding: string): number {
  const parts = padding.split(' ');
  const firstValue = parseFloat(parts[0]) || 0;
  return firstValue;
}

/**
 * Gets the actual font size from button text content
 * Buttons often have base font on the wrapper, but larger font on the text inside
 */
export function getButtonTextFontSize(button: HTMLElement): string {
  // First try: find the first text-bearing child element
  const textElements = button.querySelectorAll('div, span, a');
  for (let i = 0; i < textElements.length; i++) {
    const el = textElements[i] as HTMLElement;
    const text = el.textContent?.trim() || '';

    // Skip empty elements and icons
    if (text.length > 0 && text.length < 100 && !el.className.includes('icon')) {
      const styles = getComputedStyle(el);
      const fontSize = parseFloat(styles.fontSize);

      // Return if we found a reasonable font size
      if (fontSize >= 10 && fontSize <= 32) {
        return `${fontSize}px`;
      }
    }
  }

  // Fallback: if button has direct text content, use button's font size
  const buttonText = button.textContent?.trim() || '';
  if (buttonText.length > 0) {
    const buttonStyles = getComputedStyle(button);
    return buttonStyles.fontSize;
  }

  // Last resort: return button's font size
  return getComputedStyle(button).fontSize;
}
