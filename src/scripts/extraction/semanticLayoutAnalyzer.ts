/**
 * Semantic Layout Analyzer
 *
 * Replaces verbose DOM tree extraction with high-level semantic layout analysis.
 * Identifies major layout patterns and regions with measurements.
 */

import { getCachedElements, getCachedComputedStyle } from '../utils/domCache';
import { isVisible } from '../utils/domFilters';

/**
 * Layout structure type classification
 */
export type LayoutStructureType =
  | 'sidebar-content'
  | 'three-column'
  | 'centered'
  | 'dashboard'
  | 'split-view'
  | 'single-column'
  | 'grid-layout'
  | 'custom';

/**
 * Semantic region in the layout
 */
export interface LayoutRegion {
  name: string;
  role: string;
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  width?: string;
  height?: string;
  contains?: string[];
  background?: string;
  zIndex?: string;
}

/**
 * Layout measurements for major sections
 */
export interface LayoutMeasurements {
  sidebarWidth?: string;
  topbarHeight?: string;
  contentPadding?: string;
  sectionGap?: string;
  rowHeight?: string;
  columnWidths?: Record<string, string>;
}

/**
 * High-level semantic layout description
 */
export interface SemanticLayout {
  structure: LayoutStructureType;
  regions: LayoutRegion[];
  measurements: LayoutMeasurements;
  gridPattern?: string;
}

/**
 * Analyzes the page to determine the high-level layout structure type
 */
function detectLayoutStructure(): LayoutStructureType {
  const body = document.body;
  const mainContainer = document.querySelector('main, [role="main"], #main, .main') || body;

  // Check for sidebar patterns
  const sidebars = Array.from(getCachedElements()).filter(el => {
    const styles = getCachedComputedStyle(el);
    const width = parseFloat(styles.width);
    const height = parseFloat(styles.height);
    const position = styles.position;

    const isSidebarLike = (
      (position === 'fixed' || position === 'sticky' || position === 'absolute') &&
      width > 150 && width < 500 &&
      height > window.innerHeight * 0.5
    );

    // Convert className to string for safe comparison (handles SVG elements)
    const classNameStr = String(el.className || '');
    const hasSidebarClass = classNameStr && (
      classNameStr.includes('sidebar') ||
      classNameStr.includes('nav') ||
      classNameStr.includes('menu')
    );

    return isSidebarLike || hasSidebarClass;
  });

  // Check for grid layout
  const hasGridLayout = Array.from(getCachedElements()).some(el => {
    const styles = getCachedComputedStyle(el);
    return styles.display === 'grid' && el.children.length > 4;
  });

  // Check for three-column layout
  const threeColumnIndicators = document.querySelectorAll('[class*="column"], [class*="col-"]');
  const hasThreeColumns = threeColumnIndicators.length >= 3;

  // Check for dashboard pattern (multiple cards/panels)
  const dashboardIndicators = document.querySelectorAll(
    '[class*="card"], [class*="panel"], [class*="widget"], [class*="tile"]'
  );
  const hasDashboard = dashboardIndicators.length > 4;

  // Determine structure
  if (sidebars.length >= 2) return 'three-column';
  if (sidebars.length === 1) return 'sidebar-content';
  if (hasThreeColumns) return 'three-column';
  if (hasDashboard && hasGridLayout) return 'dashboard';
  if (hasGridLayout) return 'grid-layout';

  // Check for split view (two equal sections side by side)
  const flexContainers = Array.from(getCachedElements()).filter(el => {
    const styles = getCachedComputedStyle(el);
    return styles.display === 'flex' && el.children.length === 2;
  });

  const hasSplitView = flexContainers.some(container => {
    const children = Array.from(container.children);
    if (children.length !== 2) return false;

    const widths = children.map(child => {
      const styles = getCachedComputedStyle(child as HTMLElement);
      return parseFloat(styles.width);
    });

    // Check if both children take roughly equal space (40-60% each)
    const total = widths[0] + widths[1];
    return widths.every(w => w > total * 0.4 && w < total * 0.6);
  });

  if (hasSplitView) return 'split-view';

  // Check for centered layout
  const centeredContainers = document.querySelectorAll(
    '[class*="container"], [class*="wrapper"], main'
  );
  const hasCentered = Array.from(centeredContainers).some(el => {
    const styles = getCachedComputedStyle(el);
    return styles.marginLeft === 'auto' && styles.marginRight === 'auto' && styles.maxWidth !== 'none';
  });

  if (hasCentered) return 'centered';

  // Check for single column
  const mainWidth = parseFloat(getCachedComputedStyle(mainContainer).width);
  if (mainWidth < window.innerWidth * 0.8) return 'single-column';

  return 'custom';
}

/**
 * Identifies and extracts semantic regions from the page
 */
function extractLayoutRegions(): LayoutRegion[] {
  const regions: LayoutRegion[] = [];

  // Detect sidebar
  const sidebar = document.querySelector(
    'aside, [role="complementary"], [class*="sidebar"], nav[class*="side"]'
  );
  if (sidebar && isVisible(sidebar)) {
    const styles = getCachedComputedStyle(sidebar);
    const rect = sidebar.getBoundingClientRect();

    // Determine position
    let position: 'left' | 'right' = 'left';
    if (rect.right > window.innerWidth * 0.7) position = 'right';

    // Detect what's inside
    const contains: string[] = [];
    if (sidebar.querySelector('nav, [role="navigation"]')) contains.push('navigation');
    if (sidebar.querySelector('button, a')) contains.push('links');
    if (sidebar.querySelector('form, input')) contains.push('search');
    if (sidebar.querySelector('[class*="logo"]')) contains.push('logo');

    regions.push({
      name: 'sidebar',
      role: 'navigation',
      position,
      width: `${Math.round(rect.width)}px`,
      height: `${Math.round(rect.height)}px`,
      contains: contains.length > 0 ? contains : ['navigation'],
      background: styles.backgroundColor,
      zIndex: styles.zIndex
    });
  }

  // Detect topbar/header
  const topbar = document.querySelector('header, [role="banner"], [class*="topbar"], [class*="header"]');
  if (topbar && isVisible(topbar)) {
    const styles = getCachedComputedStyle(topbar);
    const rect = topbar.getBoundingClientRect();

    const contains: string[] = [];
    if (topbar.querySelector('nav')) contains.push('navigation');
    if (topbar.querySelector('button, [role="button"]')) contains.push('actions');
    if (topbar.querySelector('[class*="logo"], img')) contains.push('branding');
    if (topbar.querySelector('input, [class*="search"]')) contains.push('search');

    regions.push({
      name: 'topbar',
      role: 'banner',
      position: 'top',
      height: `${Math.round(rect.height)}px`,
      width: `${Math.round(rect.width)}px`,
      contains: contains.length > 0 ? contains : ['branding', 'navigation'],
      background: styles.backgroundColor,
      zIndex: styles.zIndex
    });
  }

  // Detect main content area
  const main = document.querySelector('main, [role="main"], #main, .main, [class*="content"]');
  if (main && isVisible(main)) {
    const styles = getCachedComputedStyle(main);
    const rect = main.getBoundingClientRect();

    const contains: string[] = [];
    if (main.querySelector('table, [role="table"]')) contains.push('data-table');
    if (main.querySelector('form')) contains.push('form');
    if (main.querySelector('article, [class*="card"]')) contains.push('cards');
    if (main.querySelector('[class*="grid"]')) contains.push('grid-layout');

    regions.push({
      name: 'main',
      role: 'main',
      position: 'center',
      width: `${Math.round(rect.width)}px`,
      contains: contains.length > 0 ? contains : ['content'],
      background: styles.backgroundColor
    });
  }

  // Detect footer
  const footer = document.querySelector('footer, [role="contentinfo"]');
  if (footer && isVisible(footer)) {
    const styles = getCachedComputedStyle(footer);
    const rect = footer.getBoundingClientRect();

    regions.push({
      name: 'footer',
      role: 'contentinfo',
      position: 'bottom',
      height: `${Math.round(rect.height)}px`,
      background: styles.backgroundColor
    });
  }

  return regions;
}

/**
 * Extracts concrete measurements for major layout sections
 */
function extractLayoutMeasurements(): LayoutMeasurements {
  const measurements: LayoutMeasurements = {};

  // Sidebar width
  const sidebar = document.querySelector('aside, [class*="sidebar"]');
  if (sidebar) {
    const width = parseFloat(getCachedComputedStyle(sidebar).width);
    if (width > 0) measurements.sidebarWidth = `${Math.round(width)}px`;
  }

  // Topbar height
  const topbar = document.querySelector('header, [class*="topbar"], [class*="header"]');
  if (topbar) {
    const height = parseFloat(getCachedComputedStyle(topbar).height);
    if (height > 0) measurements.topbarHeight = `${Math.round(height)}px`;
  }

  // Content padding
  const main = document.querySelector('main, [role="main"]');
  if (main) {
    const padding = getCachedComputedStyle(main).padding;
    if (padding && padding !== '0px') measurements.contentPadding = padding;
  }

  // Section gap (spacing between major sections)
  const sections = document.querySelectorAll('section, [class*="section"]');
  if (sections.length > 1) {
    const gaps: number[] = [];
    for (let i = 0; i < sections.length - 1; i++) {
      const current = sections[i].getBoundingClientRect();
      const next = sections[i + 1].getBoundingClientRect();
      const gap = next.top - current.bottom;
      if (gap > 0 && gap < 200) gaps.push(gap);
    }
    if (gaps.length > 0) {
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      measurements.sectionGap = `${Math.round(avgGap)}px`;
    }
  }

  // Row height (for tables or grid rows)
  const rows = document.querySelectorAll('tr, [role="row"], [class*="row"]:not([class*="container"])');
  if (rows.length > 0) {
    const heights: number[] = [];
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const height = parseFloat(getCachedComputedStyle(rows[i]).height);
      if (height > 0 && height < 200) heights.push(height);
    }
    if (heights.length > 0) {
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
      measurements.rowHeight = `${Math.round(avgHeight)}px`;
    }
  }

  // Column widths (for tables)
  const table = document.querySelector('table');
  if (table) {
    const cells = table.querySelectorAll('th, td');
    const widths = new Map<string, number[]>();

    cells.forEach((cell) => {
      const colIndex = (cell as HTMLTableCellElement).cellIndex;
      const width = parseFloat(getCachedComputedStyle(cell).width);

      if (!widths.has(`col-${colIndex}`)) widths.set(`col-${colIndex}`, []);
      widths.get(`col-${colIndex}`)!.push(width);
    });

    const columnWidths: Record<string, string> = {};
    widths.forEach((values, key) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > 0) columnWidths[key] = `${Math.round(avg)}px`;
    });

    if (Object.keys(columnWidths).length > 0) {
      measurements.columnWidths = columnWidths;
    }
  }

  return measurements;
}

/**
 * Detects grid pattern if layout uses CSS Grid
 */
function detectGridPattern(): string | undefined {
  const gridContainers = Array.from(getCachedElements()).filter(el => {
    const styles = getCachedComputedStyle(el);
    return styles.display === 'grid';
  });

  if (gridContainers.length === 0) return undefined;

  // Find the most common grid pattern
  const patterns = new Map<string, number>();

  gridContainers.forEach(container => {
    const styles = getCachedComputedStyle(container);
    const cols = styles.gridTemplateColumns;
    if (cols && cols !== 'none') {
      patterns.set(cols, (patterns.get(cols) || 0) + 1);
    }
  });

  if (patterns.size === 0) return undefined;

  // Return most common pattern
  const sorted = Array.from(patterns.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Main function to analyze and extract semantic layout
 */
export function analyzeSemanticLayout(): SemanticLayout {
  const structure = detectLayoutStructure();
  const regions = extractLayoutRegions();
  const measurements = extractLayoutMeasurements();
  const gridPattern = detectGridPattern();

  return {
    structure,
    regions,
    measurements,
    ...(gridPattern && { gridPattern })
  };
}
