/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login
       * @example cy.login('test@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Custom command to register a new user
       * @example cy.register('John Doe', 'test@example.com', 'password123')
       */
      register(name: string, email: string, password: string): Chainable<void>;

      /**
       * Custom command to logout
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Custom command to check if user is logged in
       * @example cy.shouldBeLoggedIn()
       */
      shouldBeLoggedIn(): Chainable<void>;

      /**
       * Custom command to check if user is logged out
       * @example cy.shouldBeLoggedOut()
       */
      shouldBeLoggedOut(): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();

  // Wait for navigation after successful login
  cy.url().should('not.include', '/auth/login');
});

// Register command
Cypress.Commands.add('register', (name: string, email: string, password: string) => {
  cy.visit('/auth/register');
  cy.get('input[name="name"]').type(name);
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('input[name="confirmPassword"]').type(password);
  cy.get('button[type="submit"]').click();

  // Wait for navigation after successful registration
  cy.url().should('not.include', '/auth/register');
});

// Logout command
Cypress.Commands.add('logout', () => {
  // Click logout button if available
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="logout-button"]').length > 0) {
      cy.get('[data-testid="logout-button"]').click();
    } else {
      // Fallback: clear cookies manually
      cy.clearCookies();
      cy.visit('/');
    }
  });
});

// Check if logged in
Cypress.Commands.add('shouldBeLoggedIn', () => {
  cy.getCookie('accessToken').should('exist');
});

// Check if logged out
Cypress.Commands.add('shouldBeLoggedOut', () => {
  cy.getCookie('accessToken').should('not.exist');
});

export {};
