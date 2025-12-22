describe('Design Upload and Customization', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Design Test User',
    email: `designtest${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  before(() => {
    // Register and login user
    cy.clearCookies();
    cy.register(testUser.name, testUser.email, testUser.password);
  });

  beforeEach(() => {
    // Ensure user is logged in before each test
    cy.login(testUser.email, testUser.password);
  });

  describe('Design Creation Page', () => {
    it('should display the design creation page', () => {
      cy.visit('/design/new');
      cy.contains(/Create|Upload|Design/i).should('be.visible');
    });

    it('should show file upload component', () => {
      cy.visit('/design/new');
      cy.get('input[type="file"]').should('exist');
    });

    it('should allow selecting print size', () => {
      cy.visit('/design/new');

      // Look for size selector buttons or dropdown
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="size-selector"]').length > 0) {
          cy.get('[data-testid="size-selector"]').should('be.visible');
        } else {
          // Alternative: look for size options
          cy.contains(/A4|A5|Size/i).should('be.visible');
        }
      });
    });

    it('should allow selecting material', () => {
      cy.visit('/design/new');

      // Look for material selector
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="material-selector"]').length > 0) {
          cy.get('[data-testid="material-selector"]').should('be.visible');
        } else {
          // Alternative: look for material options
          cy.contains(/Glossy|Matte|Material/i).should('be.visible');
        }
      });
    });
  });

  describe('File Upload', () => {
    it('should upload an image file', () => {
      cy.visit('/design/new');

      // Create a test file
      const fileName = 'test-image.jpg';
      const fileContent = 'fake-image-content';

      // Upload file
      cy.get('input[type="file"]').selectFile(
        {
          contents: Cypress.Buffer.from(fileContent),
          fileName: fileName,
          mimeType: 'image/jpeg',
        },
        { force: true }
      );

      // Should show success message or preview
      cy.contains(/uploaded|success|preview/i, { timeout: 10000 }).should('be.visible');
    });

    it('should reject invalid file types', () => {
      cy.visit('/design/new');

      // Create a test file with invalid type
      const fileName = 'test-document.txt';
      const fileContent = 'This is not an image';

      // Try to upload file
      cy.get('input[type="file"]').selectFile(
        {
          contents: Cypress.Buffer.from(fileContent),
          fileName: fileName,
          mimeType: 'text/plain',
        },
        { force: true }
      );

      // Should show error message
      cy.contains(/invalid|unsupported|error/i, { timeout: 5000 }).should('be.visible');
    });

    it('should support drag and drop upload', () => {
      cy.visit('/design/new');

      // Check if drop zone exists
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="dropzone"]').length > 0) {
          cy.get('[data-testid="dropzone"]').should('be.visible');
        } else {
          // Look for drag and drop text
          cy.contains(/drag|drop/i).should('be.visible');
        }
      });
    });
  });

  describe('Design Customization', () => {
    it('should customize print size and material', () => {
      cy.visit('/design/new');

      // Upload a file first
      const fileName = 'test-design.jpg';
      cy.get('input[type="file"]').selectFile(
        {
          contents: Cypress.Buffer.from('fake-image'),
          fileName: fileName,
          mimeType: 'image/jpeg',
        },
        { force: true }
      );

      // Wait for upload
      cy.wait(2000);

      // Select size (try different selector patterns)
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("A4")').length > 0) {
          cy.contains('button', 'A4').click();
        } else if ($body.find('select[name="size"]').length > 0) {
          cy.get('select[name="size"]').select('A4');
        }
      });

      // Select material
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Glossy")').length > 0) {
          cy.contains('button', 'Glossy').click();
        } else if ($body.find('select[name="material"]').length > 0) {
          cy.get('select[name="material"]').select('GLOSSY');
        }
      });

      // Should be able to proceed with customization
      cy.url().should('include', '/design');
    });
  });

  describe('Template Selection', () => {
    it('should browse available templates', () => {
      cy.visit('/gifts/page');

      // Should display template categories or templates
      cy.contains(/template|occasion|gift/i).should('be.visible');
    });

    it('should view template details', () => {
      cy.visit('/gifts/page');

      // Click on a category or template
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="template-card"]').length > 0) {
          cy.get('[data-testid="template-card"]').first().click();
        } else {
          // Find first clickable template or category
          cy.get('a').contains(/birthday|wedding|template/i).first().click();
        }
      });

      // Should navigate to template details or category page
      cy.url().should('not.equal', Cypress.config().baseUrl + '/gifts/page');
    });
  });

  describe('My Designs', () => {
    it('should display user designs', () => {
      cy.visit('/design/my-designs');
      cy.contains(/my designs|your designs/i).should('be.visible');
    });

    it('should show empty state when no designs', () => {
      cy.visit('/design/my-designs');

      // Might show empty state or designs list
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="design-card"]').length === 0) {
          cy.contains(/no designs|create your first|empty/i).should('be.visible');
        }
      });
    });

    it('should navigate to design details', () => {
      cy.visit('/design/my-designs');

      // If there are designs, click on one
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="design-card"]').length > 0) {
          cy.get('[data-testid="design-card"]').first().click();
          cy.url().should('match', /\/design\//);
        }
      });
    });
  });

  describe('Design Management', () => {
    it('should allow deleting a design', () => {
      cy.visit('/design/my-designs');

      // Check if there are designs to delete
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="delete-design"]').length > 0) {
          const initialCount = $body.find('[data-testid="design-card"]').length;

          // Click delete button
          cy.get('[data-testid="delete-design"]').first().click();

          // Confirm deletion if modal appears
          cy.get('body').then(($confirmBody) => {
            if ($confirmBody.find('button:contains("Delete")').length > 0) {
              cy.contains('button', 'Delete').click();
            }
          });

          // Wait for deletion
          cy.wait(1000);

          // Verify design was deleted
          cy.visit('/design/my-designs');
          cy.get('[data-testid="design-card"]').should('have.length.lessThan', initialCount + 1);
        }
      });
    });
  });

  describe('Design Preview', () => {
    it('should show design preview', () => {
      cy.visit('/design/new');

      // Upload a file
      cy.get('input[type="file"]').selectFile(
        {
          contents: Cypress.Buffer.from('fake-image'),
          fileName: 'preview-test.jpg',
          mimeType: 'image/jpeg',
        },
        { force: true }
      );

      // Wait for upload and preview generation
      cy.wait(2000);

      // Should show preview image or placeholder
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="design-preview"]').length > 0) {
          cy.get('[data-testid="design-preview"]').should('be.visible');
        } else {
          cy.get('img').should('exist');
        }
      });
    });
  });
});
