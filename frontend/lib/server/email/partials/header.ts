import { COLORS, STYLES, EMAIL_CONFIG } from '../config';

export interface HeaderOptions {
  color?: string;
  title?: string;
}

/**
 * Generate email header HTML
 */
export function getHeader(options: HeaderOptions = {}): string {
  const { color = COLORS.primary, title = EMAIL_CONFIG.APP_NAME } = options;

  return `
    <div style="background-color: ${color}; padding: ${STYLES.padding}; border-radius: ${STYLES.borderRadiusLg} ${STYLES.borderRadiusLg} 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
    </div>
  `;
}
