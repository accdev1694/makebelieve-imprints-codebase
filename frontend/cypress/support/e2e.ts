// Import commands
import './commands';

// Note: Cypress.Cookies.defaults was removed in Cypress 12+
// Session cookies are now handled via cy.session() for preserving auth state

// Global before hook
before(() => {
  // Clear cookies before starting tests
  cy.clearCookies();
});

// Global after each hook
afterEach(() => {
  // Placeholder for any cleanup needed after each test
});
