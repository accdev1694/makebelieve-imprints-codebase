# Royal Mail API Fallback Procedures

## Overview

The MakeBelieve Imprints platform integrates with the **Royal Mail Click and Drop API** for automated shipping label generation and tracking. This document outlines fallback procedures when the API is unavailable, degraded, or deprecated.

## Primary Integration (Normal Operations)

**Royal Mail Click and Drop API** provides:
- Automated shipping label generation
- Address validation
- Postage cost calculation
- Tracking number generation
- Real-time shipment status updates

**Backend Implementation:**
- Service: `src/services/royal-mail.service.ts`
- Endpoints: `POST /api/orders/:id/ship`, `GET /api/orders/:id/tracking`
- API Docs: https://developer.royalmail.net/

## Failure Scenarios

### 1. API Downtime (Temporary)
**Symptoms:** API requests timeout or return 5xx errors
**Duration:** Minutes to hours
**Impact:** Cannot generate shipping labels automatically

### 2. Rate Limiting
**Symptoms:** HTTP 429 (Too Many Requests)
**Duration:** Short-term (minutes)
**Impact:** Temporary inability to process shipments

### 3. API Deprecation
**Symptoms:** Advance notice from Royal Mail, eventual HTTP 410 (Gone)
**Duration:** Permanent
**Impact:** Need to migrate to new API or alternative service

### 4. Account Issues
**Symptoms:** HTTP 401/403 (Authentication failed)
**Duration:** Until credentials are renewed
**Impact:** All API calls fail

## Fallback Procedures

### Manual Label Generation (Immediate Fallback)

**When to Use:** API downtime or rate limiting (< 24 hours expected)

**Steps:**
1. **Admin Dashboard Alert:**
   - System detects API failure (3 consecutive timeouts or 5xx responses)
   - Admin dashboard shows alert: "Royal Mail API Unavailable - Manual Processing Required"
   - Pending shipments are flagged for manual handling

2. **Manual Processing:**
   - Admin logs into Royal Mail Click and Drop web portal: https://www.royalmail.com/sending/click-and-drop
   - Downloads pending order details from admin dashboard as CSV:
     - Order ID, Customer Name, Shipping Address, Package Details
   - Manually creates shipping labels in Royal Mail portal
   - Downloads label PDFs

3. **Update Order Status:**
   - Admin uploads tracking numbers via admin dashboard bulk import
   - Format: `order_id,tracking_number`
   - System updates orders and sends tracking emails to customers

4. **Print and Ship:**
   - Print labels using printer
   - Affix to packages
   - Drop off at Royal Mail collection point

**Pros:**
- Quick to implement
- No code changes needed
- Works for small volumes (<20 orders/day)

**Cons:**
- Manual labor intensive
- Slower processing
- Potential for human error

### API Retry with Exponential Backoff (Automatic)

**When to Use:** Transient failures, rate limiting

**Implementation (already in code):**
```typescript
async function createShipmentWithRetry(orderData: ShipmentRequest, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await royalMailAPI.createShipment(orderData);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Monitoring:**
- Log all retry attempts
- Alert if retry rate > 10% of requests
- Trigger manual fallback if all retries fail for > 30 minutes

### Alternative Carrier Integration (Long-term Fallback)

**When to Use:** Prolonged API outage (>48 hours) or API deprecation

**Options:**

#### Option 1: Evri (Hermes) API
- **API:** https://developers.evri.com/
- **Pros:** Similar API structure, UK-focused
- **Cons:** Different pricing model, need new contract
- **Effort:** 2-3 days integration

#### Option 2: DPD API
- **API:** https://www.dpd.co.uk/content/products_services/api.jsp
- **Pros:** Reliable service, good API documentation
- **Cons:** Higher cost per shipment
- **Effort:** 2-3 days integration

#### Option 3: Multi-Carrier Platform (e.g., Shippo, EasyPost)
- **API:** https://goshippo.com/docs/ or https://www.easypost.com/docs/api
- **Pros:** Single API for multiple carriers (Royal Mail, DPD, Evri, etc.)
- **Cons:** Additional cost, vendor lock-in
- **Effort:** 3-5 days integration + testing

**Recommended Approach:**
1. Implement carrier abstraction layer in code:
   ```typescript
   interface ShippingProvider {
     createShipment(order: Order): Promise<Shipment>;
     getTracking(trackingNumber: string): Promise<TrackingStatus>;
   }

   class RoyalMailProvider implements ShippingProvider { /* ... */ }
   class EvriProvider implements ShippingProvider { /* ... */ }
   class ShippoProvider implements ShippingProvider { /* ... */ }
   ```

2. Environment variable to switch providers:
   ```bash
   SHIPPING_PROVIDER=royal-mail  # or "evri", "shippo"
   ```

3. Graceful degradation:
   - If primary provider fails, attempt secondary provider
   - Log all provider switches for monitoring

### Emergency CSV Export/Import Workflow

**When to Use:** Complete system failure or prolonged API outage

**Export Pending Shipments:**
```bash
GET /api/admin/orders/export?status=confirmed
# Returns CSV: order_id,name,address_line1,city,postal_code,weight,dimensions
```

**Process Externally:**
- Use any shipping platform (Royal Mail web portal, Shippo, manual labels)
- Generate tracking numbers

**Import Tracking Numbers:**
```bash
POST /api/admin/orders/import-tracking
Content-Type: text/csv

order_id,tracking_number,carrier
abc-123,RM123456789GB,Royal Mail
def-456,RM987654321GB,Royal Mail
```

**System Actions:**
- Updates order status to `shipped`
- Sends tracking email to customers
- Records carrier and tracking number

## Monitoring and Alerts

### Health Check Endpoint

```bash
GET /api/integrations/royal-mail/health
```

**Response (Healthy):**
```json
{
  "status": "healthy",
  "provider": "royal-mail",
  "lastSuccessfulRequest": "2025-01-15T10:30:00Z",
  "failureCount24h": 0
}
```

**Response (Degraded):**
```json
{
  "status": "degraded",
  "provider": "royal-mail",
  "lastSuccessfulRequest": "2025-01-15T08:00:00Z",
  "failureCount24h": 12,
  "message": "High failure rate detected. Manual fallback recommended."
}
```

### Alert Triggers

**Warning Level:**
- 5+ API failures in 1 hour
- Response time > 5 seconds
- Action: Send email to admin

**Critical Level:**
- 10+ consecutive API failures
- No successful request in last 30 minutes
- Action: Send SMS to admin, display dashboard alert

**Automated Actions:**
- Switch to manual fallback mode (disable automatic shipment creation)
- Queue orders for manual processing
- Display maintenance banner to customers: "Shipment processing may be delayed"

## Testing Fallback Procedures

### Monthly Drill (1st Monday of Month)

1. **Simulate API Failure:**
   ```bash
   # Staging environment only
   export ROYAL_MAIL_API_URL=https://fake-api-returns-500.test
   pm2 restart backend-staging
   ```

2. **Process Test Order Manually:**
   - Create test order in staging
   - Follow manual fallback procedure
   - Upload tracking number
   - Verify customer email sent

3. **Restore Normal Operation:**
   ```bash
   export ROYAL_MAIL_API_URL=https://api.parcel.royalmail.com
   pm2 restart backend-staging
   ```

4. **Document Time Taken:**
   - Target: < 15 minutes from failure detection to manual processing
   - Record any issues or improvements needed

### Quarterly Review

- Review Royal Mail API status page: https://status.royalmail.com
- Check for upcoming API changes or deprecations
- Test alternative carrier API (Evri, DPD) in staging
- Update credentials and API keys

## Incident Response Checklist

**When Royal Mail API Fails:**

- [ ] Confirm API status (check Royal Mail status page, Twitter)
- [ ] Check backend logs for error details (`pm2 logs backend | grep "royal-mail"`)
- [ ] Verify API credentials are valid (test with cURL)
- [ ] Enable manual fallback mode if failure > 30 minutes
- [ ] Notify customers of potential delay (email blast, website banner)
- [ ] Process pending shipments manually via Royal Mail web portal
- [ ] Upload tracking numbers via admin dashboard
- [ ] Monitor API recovery (health check every 5 minutes)
- [ ] Re-enable automatic mode when API is stable (1 hour of successful requests)
- [ ] Post-incident review: document root cause and lessons learned

## Contact Information

**Royal Mail Support:**
- Developer Support: https://developer.royalmail.net/support
- Click and Drop Support: 0345 600 0606
- Account Manager: [Insert contact when account is created]

**Alternative Carriers:**
- Evri Sales: 0844 561 1502
- DPD Sales: 0121 275 0500
- Shippo Support: support@goshippo.com

## Conclusion

The Royal Mail API integration is critical for automated order fulfillment, but manual fallback procedures ensure business continuity during outages. Regular testing, monitoring, and maintaining alternative carrier options will minimize customer impact during API failures.

**Key Principles:**
1. **Detect Early:** Monitor API health proactively
2. **Fail Gracefully:** Degrade to manual processing, don't block orders
3. **Communicate:** Notify customers of delays immediately
4. **Have Alternatives:** Maintain relationships with multiple carriers
5. **Test Regularly:** Practice fallback procedures monthly
