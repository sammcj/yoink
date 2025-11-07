/**
 * Type definitions for Yoink extraction modules
 */

export interface ScanStylesRequest {
  action: 'scanStyles';
  includeComponents?: boolean;
}

export interface ScanResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Parsed shadow data structure
 */
export interface ParsedShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
  raw: string;
}

/**
 * Shadow group with elevation level
 */
export interface ShadowGroup {
  shadows: ParsedShadow[];
  elevationLevel: number;
  name: string;
  count: number;
  intensity: number;
  representative: string;
}

/**
 * Shadow system analysis result
 */
export interface ShadowSystem {
  elevationLevels: ShadowGroup[];
  pattern: string;
  totalUniqueShadows: number;
}

/**
 * Enhanced typography analysis result
 */
export interface TypographyAnalysis {
  headings: { [tag: string]: any };
  body: any[];
  typeScale: TypeScaleAnalysis;
  lineHeightPatterns: LineHeightPattern[];
}

/**
 * Type scale analysis
 */
export interface TypeScaleAnalysis {
  baseSize: number;
  ratio: number;
  ratioName: string;
  scale: number[];
  confidence: string;
}

/**
 * Line height pattern
 */
export interface LineHeightPattern {
  value: string;
  ratio: number;
  count: number;
  usage: string;
}
