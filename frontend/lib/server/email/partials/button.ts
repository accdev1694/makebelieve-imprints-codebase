import { COLORS, STYLES } from '../config';

export interface ButtonOptions {
  text: string;
  url: string;
  color?: string;
}

/**
 * Generate a call-to-action button
 */
export function getButton(options: ButtonOptions): string {
  const { text, url, color = COLORS.primary } = options;

  return `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="background-color: ${color}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: ${STYLES.borderRadius}; font-weight: bold; display: inline-block; border: 2px solid ${color};">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Generate fallback link text (for accessibility)
 */
export function getFallbackLink(url: string): string {
  return `
    <p style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 0;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${url}" style="color: ${COLORS.primary}; word-break: break-all;">${url}</a>
    </p>
  `;
}
