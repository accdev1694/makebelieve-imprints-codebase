import { COLORS, EMAIL_CONFIG, getCurrentYear } from '../config';

/**
 * Generate email footer HTML
 */
export function getFooter(): string {
  return `
    <div style="text-align: center; padding: 20px; color: ${COLORS.textMuted}; font-size: 12px;">
      <p>&copy; ${getCurrentYear()} ${EMAIL_CONFIG.APP_NAME}. All rights reserved.</p>
    </div>
  `;
}
