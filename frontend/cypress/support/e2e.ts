// Import commands
import './commands';

// Preserve cookies between tests
Cypress.Cookies.defaults({
  preserve: (cookie) => {
    return ['accessToken', 'refreshToken'].includes(cookie);
  },
});

// Global before hook
before(() => {
  // Clear cookies before starting tests
  cy.clearCookies();
});

// Global after each hook
afterEach(() => {
  // Log any console errors
  cy.window().then((win) => {
    const errors = win.console.error;
    if (errors && errors.callCount > 0) {
      cy.log(`Console errors detected: ${errors.callCount}`);
    }
  });
});
