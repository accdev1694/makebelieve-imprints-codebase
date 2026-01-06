import { COLORS, STYLES } from '../config';
import { getHeader, HeaderOptions } from './header';
import { getFooter } from './footer';

export interface LayoutOptions {
  header?: HeaderOptions;
  content: string;
}

/**
 * Wrap content in full email layout (header + content + footer)
 */
export function wrapInLayout(options: LayoutOptions): string {
  const { header = {}, content } = options;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: ${STYLES.fontStack}; line-height: 1.6; color: ${COLORS.textPrimary}; max-width: ${STYLES.maxWidth}; margin: 0 auto; padding: 20px; background-color: ${COLORS.bgGrayLight};">
      ${getHeader(header)}
      <div style="background: ${COLORS.bgWhite}; padding: ${STYLES.padding}; border: 1px solid ${COLORS.border}; border-top: none; border-radius: 0 0 ${STYLES.borderRadiusLg} ${STYLES.borderRadiusLg};">
        ${content}
      </div>
      ${getFooter()}
    </body>
    </html>
  `;
}

/**
 * Generate a horizontal divider
 */
export function getDivider(): string {
  return `<hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 30px 0;">`;
}

/**
 * Generate muted text (for notes, disclaimers)
 */
export function getMutedText(text: string): string {
  return `<p style="color: ${COLORS.textMuted}; font-size: 14px;">${text}</p>`;
}
