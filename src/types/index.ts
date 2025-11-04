/**
 * Type definitions for Yoink Design System Extractor
 */

/**
 * CSS Custom Properties organized by theme
 */
export interface CSSVariables {
  [variableName: string]: ThemeValues;
}

/**
 * Theme-specific values for a CSS variable
 */
export interface ThemeValues {
  light?: string;
  dark?: string;
  [themeName: string]: string | undefined;
}

/**
 * Color usage tracking
 */
export interface ColorUsage {
  [color: string]: number;
}

/**
 * Complete style data extracted from a page
 */
export interface StyleData {
  cssVariables: CSSVariables;
  colors: string[];
  colorUsage: ColorUsage;
  fonts: string[];
  borderRadius: string[];
  shadows: string[];
  components?: ComponentPatterns;
  typographyContext?: TypographyContext;
  colorContext?: ColorContext;
  layoutPatterns?: LayoutPatterns;
}

/**
 * Grouped CSS variables by category
 */
export interface GroupedVariables {
  brand?: VariableEntry[];
  sidebar?: VariableEntry[];
  chart?: VariableEntry[];
  semantic?: VariableEntry[];
  radius?: VariableEntry[];
  tailwind?: VariableEntry[];
  other?: VariableEntry[];
}

/**
 * Single variable entry with theme values
 */
export interface VariableEntry {
  name: string;
  themes: ThemeValues;
}

/**
 * Message types for Chrome extension communication
 */
export enum MessageType {
  EXTRACT_STYLES = 'extractStyles',
  STYLE_DATA = 'styleData'
}

/**
 * Message structure for Chrome extension communication
 */
export interface ExtensionMessage {
  type: MessageType;
  data?: StyleData;
  includeComponents?: boolean;
}

/**
 * Component patterns extracted from the page
 */
export interface ComponentPatterns {
  buttons: ComponentVariant[];
  cards: ComponentVariant[];
  inputs: ComponentVariant[];
  navigation: ComponentVariant[];
  headings: ComponentVariant[];
}

/**
 * A component variant with its styles and usage
 */
export interface ComponentVariant {
  html: string;
  classes: string;
  styles: ComponentStyles;
  variant: string;
  count: number;
  stateStyles?: {
    hover?: Partial<ComponentStyles>;
    focus?: Partial<ComponentStyles>;
  };
}

/**
 * Styles extracted from a component
 */
export interface ComponentStyles {
  background?: string;
  color?: string;
  padding?: string;
  borderRadius?: string;
  fontSize?: string;
  fontWeight?: string;
  border?: string;
  boxShadow?: string;
  display?: string;
  width?: string;
  height?: string;
  margin?: string;
  [key: string]: string | undefined;
}

/**
 * Typography context showing semantic usage
 */
export interface TypographyContext {
  headings: {
    [tag: string]: TypographyUsage;
  };
  body: TypographyUsage[];
}

/**
 * Typography usage information
 */
export interface TypographyUsage {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  color: string;
  usage: string;
  examples: string[];
  tag?: string;
}

/**
 * Color usage context and patterns
 */
export interface ColorContext {
  backgrounds: { [color: string]: number };
  text: { [color: string]: number };
  borders: { [color: string]: number };
  pairings: ColorPairing[];
}

/**
 * Common color pairing (background + text)
 */
export interface ColorPairing {
  pair: string;
  background: string;
  text: string;
  count: number;
  purpose?: string;
}

/**
 * Layout patterns and constraints
 */
export interface LayoutPatterns {
  containers: ContainerPattern[];
  breakpoints: number[];
  spacingPatterns: { [spacing: string]: SpacingPattern };
}

/**
 * Container pattern information
 */
export interface ContainerPattern {
  selector: string;
  maxWidth: string;
  padding: string;
  count: number;
}

/**
 * Spacing pattern usage
 */
export interface SpacingPattern {
  type: 'padding' | 'margin';
  count: number;
}
