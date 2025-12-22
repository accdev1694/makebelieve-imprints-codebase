describe('Authentication Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Test User',
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  beforeEach(() => {
    // Clear cookies before each test
    cy.clearCookies();
  });

  describe('User Registration', () => {
    it('should display the registration form', () => {
      cy.visit('/auth/register');
      cy.contains('Create your account').should('be.visible');
      cy.get('input[name="name"]').should('be.visible');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('input[name="confirmPassword"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible').and('contain', 'Create Account');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/auth/register');
      cy.get('button[type="submit"]').click();

      // HTML5 validation should prevent submission
      cy.url().should('include', '/auth/register');
    });

    it('should show error for password mismatch', () => {
      cy.visit('/auth/register');
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type('DifferentPassword123!');
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should successfully register a new user', () => {
      cy.visit('/auth/register');
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);
      cy.get('button[type="submit"]').click();

      // Should redirect after successful registration
      cy.url().should('not.include', '/auth/register');

      // Should be logged in
      cy.shouldBeLoggedIn();
    });

    it('should show error when registering with existing email', () => {
      cy.visit('/auth/register');
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.contains('already exists').should('be.visible');
    });

    it('should navigate to login page from register page', () => {
      cy.visit('/auth/register');
      cy.contains('Sign in').click();
      cy.url().should('include', '/auth/login');
    });
  });

  describe('User Login', () => {
    before(() => {
      // Ensure test user exists
      cy.clearCookies();
      cy.visit('/auth/register');
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('not.include', '/auth/register');
      cy.clearCookies();
    });

    it('should display the login form', () => {
      cy.visit('/auth/login');
      cy.contains('Welcome back').should('be.visible');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible').and('contain', 'Sign In');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/auth/login');
      cy.get('input[name="email"]').type('nonexistent@example.com');
      cy.get('input[name="password"]').type('WrongPassword123!');
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.contains(/Invalid credentials|not found/i).should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/auth/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();

      // Should redirect after successful login
      cy.url().should('not.include', '/auth/login');

      // Should be logged in
      cy.shouldBeLoggedIn();
    });

    it('should navigate to register page from login page', () => {
      cy.visit('/auth/login');
      cy.contains('Sign up').click();
      cy.url().should('include', '/auth/register');
    });

    it('should persist login state after page refresh', () => {
      // Login first
      cy.login(testUser.email, testUser.password);

      // Refresh the page
      cy.reload();

      // Should still be logged in
      cy.shouldBeLoggedIn();
    });
  });

  describe('User Logout', () => {
    it('should successfully logout', () => {
      // Login first
      cy.login(testUser.email, testUser.password);
      cy.shouldBeLoggedIn();

      // Logout
      cy.logout();

      // Should be logged out
      cy.shouldBeLoggedOut();
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected routes while logged out', () => {
      cy.clearCookies();
      cy.visit('/design/my-designs');

      // Should redirect to login
      cy.url().should('include', '/auth/login');
    });

    it('should allow access to protected routes when logged in', () => {
      cy.login(testUser.email, testUser.password);
      cy.visit('/design/my-designs');

      // Should not redirect to login
      cy.url().should('not.include', '/auth/login');
      cy.url().should('include', '/design/my-designs');
    });
  });
});
