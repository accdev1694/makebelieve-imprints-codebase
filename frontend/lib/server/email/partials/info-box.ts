import { COLORS, STYLES } from '../config';

export type InfoBoxVariant = 'default' | 'success' | 'warning' | 'danger';

export interface InfoBoxOptions {
  content: string;
  variant?: InfoBoxVariant;
}

const variantStyles: Record<InfoBoxVariant, { bg: string; border: string }> = {
  default: { bg: COLORS.bgGray, border: COLORS.border },
  success: { bg: COLORS.bgSuccess, border: COLORS.success },
  warning: { bg: COLORS.bgWarning, border: COLORS.warning },
  danger: { bg: COLORS.bgDanger, border: COLORS.danger },
};

/**
 * Generate an info/summary box
 */
export function getInfoBox(options: InfoBoxOptions): string {
  const { content, variant = 'default' } = options;
  const style = variantStyles[variant];

  return `
    <div style="background: ${style.bg}; border: 1px solid ${style.border}; border-radius: ${STYLES.borderRadius}; padding: 20px; margin: 20px 0;">
      ${content}
    </div>
  `;
}

/**
 * Generate a simple summary row (label: value)
 */
export function getSummaryRow(label: string, value: string): string {
  return `
    <p style="margin: 8px 0;">
      <strong>${label}:</strong> ${value}
    </p>
  `;
}
