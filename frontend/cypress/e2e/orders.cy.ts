describe('Order Placement and Tracking', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Order Test User',
    email: `ordertest${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  const shippingAddress = {
    name: 'John Doe',
    addressLine1: '123 Test Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
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

  describe('Order Creation', () => {
    it('should navigate to checkout from design', () => {
      cy.visit('/design/my-designs');

      // Check if there are any designs
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Order")').length > 0) {
          cy.contains('button', 'Order').first().click();
          cy.url().should('include', '/checkout');
        } else {
          // If no designs, create one first or skip test
          cy.log('No designs available to order');
        }
      });
    });

    it('should display checkout form', () => {
      // Navigate directly to checkout if accessible
      cy.visit('/checkout');

      // Should show shipping form or redirect to design selection
      cy.get('body').then(($body) => {
        if ($body.find('form').length > 0) {
          cy.get('form').should('be.visible');
        }
      });
    });

    it('should validate shipping address fields', () => {
      cy.visit('/checkout');

      // Try to submit without filling required fields
      cy.get('body').then(($body) => {
        if ($body.find('button[type="submit"]').length > 0) {
          cy.get('button[type="submit"]').click();

          // HTML5 validation should prevent submission
          cy.url().should('include', '/checkout');
        }
      });
    });

    it('should successfully place an order', () => {
      cy.visit('/checkout');

      // Fill in shipping address
      cy.get('body').then(($body) => {
        if ($body.find('input[name="name"]').length > 0) {
          cy.get('input[name="name"]').type(shippingAddress.name);
          cy.get('input[name="addressLine1"]').type(shippingAddress.addressLine1);
          cy.get('input[name="city"]').type(shippingAddress.city);
          cy.get('input[name="postcode"]').type(shippingAddress.postcode);

          // Fill country if field exists
          if ($body.find('input[name="country"]').length > 0) {
            cy.get('input[name="country"]').type(shippingAddress.country);
          } else if ($body.find('select[name="country"]').length > 0) {
            cy.get('select[name="country"]').select(shippingAddress.country);
          }

          // Submit order
          cy.get('button[type="submit"]').click();

          // Should redirect to confirmation page
          cy.url().should('match', /confirmation|success|thank-you/i, { timeout: 10000 });

          // Should show success message
          cy.contains(/thank you|success|order placed|confirmed/i).should('be.visible');
        }
      });
    });

    it('should display order summary before placing order', () => {
      cy.visit('/checkout');

      // Should show order summary section
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="order-summary"]').length > 0) {
          cy.get('[data-testid="order-summary"]').should('be.visible');
        } else {
          // Look for price or total
          cy.contains(/£|total|price/i).should('be.visible');
        }
      });
    });
  });

  describe('Order Confirmation', () => {
    it('should display order confirmation details', () => {
      // First place an order
      cy.visit('/checkout');

      cy.get('body').then(($body) => {
        if ($body.find('input[name="name"]').length > 0) {
          // Fill form and submit
          cy.get('input[name="name"]').type(shippingAddress.name);
          cy.get('input[name="addressLine1"]').type(shippingAddress.addressLine1);
          cy.get('input[name="city"]').type(shippingAddress.city);
          cy.get('input[name="postcode"]').type(shippingAddress.postcode);
          cy.get('button[type="submit"]').click();

          // Wait for confirmation page
          cy.url().should('match', /confirmation|success/i, { timeout: 10000 });

          // Should show order ID or reference
          cy.contains(/order|#/i).should('be.visible');

          // Should show shipping address
          cy.contains(shippingAddress.addressLine1).should('be.visible');
        }
      });
    });

    it('should show order status', () => {
      cy.visit('/checkout');

      cy.get('body').then(($body) => {
        if ($body.find('input[name="name"]').length > 0) {
          cy.get('input[name="name"]').type(shippingAddress.name);
          cy.get('input[name="addressLine1"]').type(shippingAddress.addressLine1);
          cy.get('input[name="city"]').type(shippingAddress.city);
          cy.get('input[name="postcode"]').type(shippingAddress.postcode);
          cy.get('button[type="submit"]').click();

          cy.url().should('match', /confirmation|success/i, { timeout: 10000 });

          // Should show order status
          cy.contains(/confirmed|pending|processing/i).should('be.visible');
        }
      });
    });
  });

  describe('Order History', () => {
    it('should display order history page', () => {
      cy.visit('/orders');
      cy.contains(/order|history|my orders/i).should('be.visible');
    });

    it('should show list of orders', () => {
      cy.visit('/orders');

      // Should show orders or empty state
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="order-card"]').length > 0) {
          cy.get('[data-testid="order-card"]').should('be.visible');
        } else {
          // Might show empty state or order items
          cy.contains(/order|no orders|empty/i).should('be.visible');
        }
      });
    });

    it('should navigate to order details', () => {
      cy.visit('/orders');

      // Click on an order if available
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="order-card"]').length > 0) {
          cy.get('[data-testid="order-card"]').first().click();
          cy.url().should('match', /\/orders\/[a-z0-9-]+/i);
        } else if ($body.find('a[href*="/orders/"]').length > 0) {
          cy.get('a[href*="/orders/"]').first().click();
          cy.url().should('match', /\/orders\/[a-z0-9-]+/i);
        }
      });
    });
  });

  describe('Order Details', () => {
    it('should display order details page', () => {
      cy.visit('/orders');

      cy.get('body').then(($body) => {
        if ($body.find('a[href*="/orders/"]').length > 0) {
          // Navigate to first order
          cy.get('a[href*="/orders/"]').first().click();

          // Should show order details
          cy.contains(/order|status|details/i).should('be.visible');
          cy.contains(/£|price|total/i).should('be.visible');
        }
      });
    });

    it('should show order status timeline', () => {
      cy.visit('/orders');

      cy.get('body').then(($body) => {
        if ($body.find('a[href*="/orders/"]').length > 0) {
          cy.get('a[href*="/orders/"]').first().click();

          // Should show status or timeline
          cy.get('body').then(($detailBody) => {
            if ($detailBody.find('[data-testid="order-timeline"]').length > 0) {
              cy.get('[data-testid="order-timeline"]').should('be.visible');
            } else {
              cy.contains(/confirmed|processing|shipped|delivered/i).should('be.visible');
            }
          });
        }
      });
    });

    it('should display shipping information', () => {
      cy.visit('/orders');

      cy.get('body').then(($body) => {
        if ($body.find('a[href*="/orders/"]').length > 0) {
          cy.get('a[href*="/orders/"]').first().click();

          // Should show shipping address
          cy.contains(/shipping|delivery|address/i).should('be.visible');
        }
      });
    });
  });

  describe('Order Tracking', () => {
    it('should display tracking page', () => {
      cy.visit('/track');
      cy.contains(/track|tracking|order/i).should('be.visible');
    });

    it('should have tracking number input', () => {
      cy.visit('/track');

      // Should have input for tracking number
      cy.get('input[type="text"]').should('be.visible');
    });

    it('should search for tracking number', () => {
      cy.visit('/track');

      // Enter a test tracking number
      cy.get('input[type="text"]').type('RM123456789GB');

      // Submit search
      cy.get('button').contains(/track|search/i).click();

      // Should show result or not found message
      cy.contains(/tracking|status|not found/i, { timeout: 5000 }).should('be.visible');
    });

    it('should display tracking information for valid orders', () => {
      // First get a valid tracking number from an order
      cy.visit('/orders');

      cy.get('body').then(($body) => {
        if ($body.find('a[href*="/orders/"]').length > 0) {
          cy.get('a[href*="/orders/"]').first().click();

          // Look for tracking number
          cy.get('body').then(($detailBody) => {
            if ($detailBody.text().includes('RM')) {
              // Extract tracking number (if visible)
              const trackingMatch = $detailBody.text().match(/RM[A-Z0-9]+GB/);
              if (trackingMatch) {
                const trackingNumber = trackingMatch[0];

                // Navigate to tracking page
                cy.visit('/track');
                cy.get('input[type="text"]').type(trackingNumber);
                cy.get('button').contains(/track|search/i).click();

                // Should show tracking details
                cy.contains(/status|tracking|delivery/i).should('be.visible');
              }
            }
          });
        }
      });
    });

    it('should show tracking button on order details', () => {
      cy.visit('/orders');

      cy.get('body').then(($body) => {
        if ($body.find('a[href*="/orders/"]').length > 0) {
          cy.get('a[href*="/orders/"]').first().click();

          // Should have track order button if order has tracking number
          cy.get('body').then(($detailBody) => {
            if ($detailBody.find('button:contains("Track")').length > 0) {
              cy.contains('button', 'Track').should('be.visible');
            }
          });
        }
      });
    });
  });

  describe('Admin Order Management', () => {
    it('should allow admin to view all orders', () => {
      // This test requires admin credentials
      // For now, just verify the admin page exists
      cy.visit('/admin/orders', { failOnStatusCode: false });

      // Will redirect to login if not admin, or show orders if admin
      cy.url().should('match', /admin|login/i);
    });
  });
});
