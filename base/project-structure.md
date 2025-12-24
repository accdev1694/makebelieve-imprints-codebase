# Print Shop Application - Page Structure

## Overview

This document outlines the complete page structure for the print shop e-commerce platform, including navigation hierarchy, user flows, and key features for each section.

---

## Site-Wide Components

### Header Navigation
- Logo (→ Home)
- Main Category Navigation
- Search Bar
- User Account Icon
- Shopping Cart Icon
- Contact/Support Link

### Footer
- Quick Links (About, FAQ, Contact, Shipping, Returns)
- Social Media Links
- Newsletter Signup
- Payment Methods
- Terms & Privacy Policy

---

## 1. Home Page

**URL:** `/`

### Sections
- Hero Banner (Promotions/Featured Products)
- Category Quick Links (Visual Cards)
- Best Sellers Carousel
- New Arrivals
- Customer Reviews/Testimonials
- Why Choose Us (Quality, Fast Shipping, Custom Designs)
- Blog/Inspiration Preview

---

## 2. Home & Lifestyle Prints

**URL:** `/home-lifestyle`

### Landing Page
- Category hero banner
- Subcategory grid with images
- Featured products from category

### Subcategories

| Subcategory | URL | Flow |
|-------------|-----|------|
| Mugs | `/home-lifestyle/mugs` | Listings → Product Detail → Customize → Cart |
| T-Shirts | `/home-lifestyle/t-shirts` | Listings → Product Detail → Customize → Cart |
| Cushions | `/home-lifestyle/cushions` | Listings → Product Detail → Customize → Cart |
| Water Bottles | `/home-lifestyle/water-bottles` | Listings → Product Detail → Customize → Cart |
| Mouse Mats | `/home-lifestyle/mouse-mats` | Listings → Product Detail → Customize → Cart |
| Key Chains | `/home-lifestyle/key-chains` | Listings → Product Detail → Customize → Cart |
| Tote Bags | `/home-lifestyle/tote-bags` | Listings → Product Detail → Customize → Cart |
| Phone Cases | `/home-lifestyle/phone-cases` | Listings → Product Detail → Customize → Cart |

### Product Listing Page Features
- Filter by: Price, Color, Size, Material, Popularity
- Sort by: Price (Low/High), Newest, Best Selling, Rating
- Grid/List view toggle
- Pagination or infinite scroll
- Quick view modal

### Product Detail Page
**URL:** `/home-lifestyle/[category]/[product-slug]`

- Product image gallery
- Product title & description
- Price (with quantity discounts)
- Size/Variant selector
- **"Customize This Product"** button → Design Studio
- Quantity selector
- Add to Cart
- Delivery estimate
- Product specifications
- Related products
- Customer reviews

### Custom Design Studio
**URL:** `/design-studio`

- Upload your own design (JPG, PNG, PDF, AI, PSD)
- Use online editor (text, shapes, clipart)
- Choose from design templates
- Preview on product mockup
- Save design to account
- Proceed to product selection

---

## 3. Stationery

**URL:** `/stationery`

### Landing Page
- Category overview
- Subcategory cards
- Business printing benefits

### Subcategories & Customization Flow

#### Business Cards
**URL:** `/stationery/business-cards`

**Flow:** Select Options → Upload/Design → Preview → Cart

**Customization Options:**
- Size: Standard (3.5" x 2"), Square, Mini, Folded
- Paper Type: Matte, Glossy, Uncoated, Textured, Recycled
- Paper Weight: 300gsm, 350gsm, 400gsm, 450gsm
- Finish: None, Spot UV, Foil Stamping, Embossed, Rounded Corners
- Sides: Single-sided, Double-sided
- Quantity: 50, 100, 250, 500, 1000, 2500+
- Upload: Single file or separate front/back
- Turnaround: Standard (5-7 days), Express (2-3 days), Rush (24 hours)

#### Leaflets / Flyers
**URL:** `/stationery/leaflets`

**Customization Options:**
- Size: A4, A5, A6, DL, Custom
- Paper Type: Silk, Gloss, Uncoated, Recycled
- Paper Weight: 130gsm, 170gsm, 250gsm, 350gsm
- Finish: None, Lamination (Matt/Gloss)
- Sides: Single-sided, Double-sided
- Folding: None, Half Fold, Tri-Fold, Z-Fold, Gate Fold
- Quantity: 50 - 10,000+

#### Brochures
**URL:** `/stationery/brochures`

**Customization Options:**
- Size: A4, A5, Square, Custom
- Pages: 4, 8, 12, 16, 20, 24+
- Binding: Saddle Stitch, Perfect Bound, Wire-O, Spiral
- Paper Type: Silk, Gloss, Uncoated
- Paper Weight: Cover (250-350gsm), Inner (130-170gsm)
- Finish: Lamination, Spot UV
- Quantity: 25 - 5,000+

#### Additional Stationery Products
- Letterheads (`/stationery/letterheads`)
- Envelopes (`/stationery/envelopes`)
- Notepads (`/stationery/notepads`)
- Folders (`/stationery/folders`)
- Postcards (`/stationery/postcards`)
- Booklets (`/stationery/booklets`)

### Stationery Customizer Page Structure
1. **Step 1:** Select product options (size, paper, quantity)
2. **Step 2:** Upload design or use editor
3. **Step 3:** Review proof & specifications
4. **Step 4:** Add to cart with price summary

---

## 4. Large Format Printing

**URL:** `/large-format`

### Landing Page
- Category hero with use cases
- Subcategory navigation
- Bulk order inquiry CTA

### Subcategories

#### Vinyl Banners
**URL:** `/large-format/vinyl-banners`

**Customization Options:**
- Size: Standard sizes or Custom (width x height)
- Material: Standard Vinyl, Heavy Duty, Mesh (wind-resistant)
- Thickness: 440gsm, 510gsm, 550gsm
- Finish: Matte, Gloss
- Hemming: Yes/No
- Eyelets: None, Every 1m, Every 0.5m, Custom placement
- Pole Pockets: Top, Bottom, Both, None
- Orientation: Landscape, Portrait
- Indoor/Outdoor use
- Quantity: 1 - 100+

#### Roll-Up Banners / Pull-Up Banners
**URL:** `/large-format/roll-up-banners`

**Customization Options:**
- Size: 800mm x 2000mm, 850mm x 2000mm, 1000mm x 2000mm, Custom
- Stand Type: Economy, Standard, Premium, Double-Sided
- Material: PVC, Polyester, Anti-Curl
- Carry Case: Included/Upgrade options
- Quantity: 1 - 50+

#### Additional Large Format Products
- Posters (`/large-format/posters`)
- Foam Board Signs (`/large-format/foam-boards`)
- Corrugated Plastic Signs (`/large-format/correx-signs`)
- Window Graphics (`/large-format/window-graphics`)
- Wall Murals (`/large-format/wall-murals`)
- Vehicle Wraps (`/large-format/vehicle-wraps`) → Quote Request
- A-Frames / Pavement Signs (`/large-format/a-frames`)

---

## 5. Photo Prints

**URL:** `/photo-prints`

### Landing Page
- Category hero (lifestyle imagery)
- Subcategory showcase
- Gift ideas section
- Quality guarantee messaging

### Subcategories

| Product | URL | Key Options |
|---------|-----|-------------|
| Canvas Prints | `/photo-prints/canvas` | Size, Frame Depth, Wrap Style, Frame Color |
| Aluminum Prints | `/photo-prints/aluminum` | Size, Finish (Brushed/White), Mounting |
| Acrylic Prints | `/photo-prints/acrylic` | Size, Thickness, Standoffs, LED Backlit option |
| Acrylic LED Prints | `/photo-prints/acrylic-led` | Size, LED Color, Power Type |
| Paper Prints | `/photo-prints/paper` | Size, Paper Type, Framing Options |
| Framed Prints | `/photo-prints/framed` | Size, Frame Style, Mat Options |
| Photo Books | `/photo-prints/photo-books` | Size, Pages, Cover Type, Paper |
| Photo Calendars | `/photo-prints/calendars` | Size, Start Month, Wire/Spiral |

### Product Flow
1. **Browse Listings** → View available sizes/styles
2. **Product Detail** → See options, pricing, examples
3. **Upload Photo** → Crop, adjust, enhance
4. **Customize** → Select size, finish, extras
5. **Preview** → See mockup of final product
6. **Add to Cart**

---

## 6. Digital Downloads

**URL:** `/digital-downloads`

### Landing Page
- Category introduction
- Subcategory grid
- How it works section
- License information

### Product Types
- Templates (Business Cards, Flyers, Social Media)
- Clipart & Graphics
- Fonts
- Mockups
- Design Bundles

### Product Listing Features
- Filter by: Category, File Type, Style, Price
- Preview thumbnails
- Instant download badge

### Product Detail Page
- Full preview gallery
- File format information
- License type (Personal/Commercial)
- Included files list
- Instant download after purchase
- Related products

---

## 7. User Account

**URL:** `/account`

### Pages

| Page | URL | Description |
|------|-----|-------------|
| Login | `/account/login` | Email/password, social login, guest checkout |
| Register | `/account/register` | Create account form |
| Dashboard | `/account/dashboard` | Order summary, quick actions |
| Orders | `/account/orders` | Order history with status tracking |
| Order Detail | `/account/orders/[order-id]` | Full order details, tracking, reorder |
| Saved Designs | `/account/designs` | Previously created/uploaded designs |
| Address Book | `/account/addresses` | Saved shipping/billing addresses |
| Payment Methods | `/account/payment` | Saved payment options |
| Wishlist | `/account/wishlist` | Saved products |
| Settings | `/account/settings` | Profile, password, notifications |

---

## 8. Shopping & Checkout

### Cart
**URL:** `/cart`

- Line items with thumbnails
- Quantity adjustment
- Remove items
- Design preview/edit link
- Subtotal per item
- Promo code input
- Order summary
- Continue Shopping / Proceed to Checkout

### Checkout
**URL:** `/checkout`

**Steps:**
1. **Contact Information** - Email, phone (guest or login prompt)
2. **Shipping Address** - Address form or saved addresses
3. **Shipping Method** - Standard, Express, Rush with dates/prices
4. **Payment** - Card, PayPal, Apple Pay, Google Pay, Klarna
5. **Review Order** - Final summary before placing order
6. **Confirmation** - Order placed, confirmation number, email sent

### Order Confirmation
**URL:** `/checkout/confirmation/[order-id]`

- Thank you message
- Order number
- Estimated delivery
- Order summary
- Track order button
- Continue shopping CTA

---

## 9. Support & Information Pages

| Page | URL |
|------|-----|
| About Us | `/about` |
| Contact Us | `/contact` |
| FAQ | `/faq` |
| Shipping Information | `/shipping` |
| Returns & Refunds | `/returns` |
| File Guidelines | `/file-guidelines` |
| Design Templates | `/templates` |
| Bulk / Trade Orders | `/bulk-orders` |
| Blog / Inspiration | `/blog` |
| Terms of Service | `/terms` |
| Privacy Policy | `/privacy` |
| Cookie Policy | `/cookies` |

---

## 10. Additional Features

### Quote Request System
**URL:** `/quote-request`

For complex or bulk orders:
- Product selection
- Quantity ranges
- Custom specifications
- File upload
- Contact information
- Response within 24-48 hours

### Design Services
**URL:** `/design-services`

- Professional design assistance
- Pricing packages
- Portfolio examples
- Request consultation form

### Corporate / Trade Accounts
**URL:** `/trade`

- Trade account benefits
- Application form
- Volume discounts
- Dedicated account manager
- NET payment terms

---

## URL Structure Summary

```
/
├── /home-lifestyle
│   ├── /mugs
│   ├── /t-shirts
│   ├── /cushions
│   ├── /water-bottles
│   ├── /mouse-mats
│   ├── /key-chains
│   └── /[category]/[product-slug]
├── /stationery
│   ├── /business-cards
│   ├── /leaflets
│   ├── /brochures
│   ├── /letterheads
│   └── /[product-type]/customize
├── /large-format
│   ├── /vinyl-banners
│   ├── /roll-up-banners
│   ├── /posters
│   └── /[product-type]/customize
├── /photo-prints
│   ├── /canvas
│   ├── /aluminum
│   ├── /acrylic
│   ├── /acrylic-led
│   ├── /paper
│   └── /[category]/[product-slug]
├── /digital-downloads
│   └── /[product-slug]
├── /design-studio
├── /account
│   ├── /login
│   ├── /register
│   ├── /dashboard
│   ├── /orders
│   └── /designs
├── /cart
├── /checkout
├── /quote-request
├── /blog
└── /[info-pages]
```

---

## Notes for Development

1. **SEO Considerations:** All product pages should have unique meta titles, descriptions, and structured data (Product schema).

2. **Mobile First:** Design all pages mobile-responsive, especially the design studio and customization flows.

3. **Performance:** Implement lazy loading for product images and infinite scroll where appropriate.

4. **Accessibility:** Ensure WCAG 2.1 AA compliance across all pages.

5. **Analytics:** Track key events: product views, add to cart, checkout steps, design uploads.

6. **Integrations:** Consider integrations for print fulfillment, payment gateways, shipping carriers, and email marketing.