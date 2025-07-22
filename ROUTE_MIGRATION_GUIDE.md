# Phoenix 10 - Route Migration Guide

## Overview
This document outlines the migration from the legacy flat routing structure to a new hierarchical, modular routing system. The new structure provides better organization, maintainability, and follows RESTful conventions.

## New Route Structure

### 1. Authentication Routes (`/auth/*`)
| Old Route | New Route | Method | Status |
|-----------|-----------|---------|---------|
| `/signup` | `/auth/signup` | GET, POST | ✅ Redirected |
| `/login` | `/auth/login` | GET, POST | ✅ Redirected |
| `/logout` | `/auth/logout` | GET | ✅ Redirected |
| `/verify-otp` | `/auth/verify-otp` | GET, POST | ✅ Redirected |
| `/auth/google` | `/auth/google` | GET | ✅ Moved |
| `/auth/google/callback` | `/auth/google/callback` | GET | ✅ Moved |

### 2. Password Management Routes (`/password/*`)
| Old Route | New Route | Method | Status |
|-----------|-----------|---------|---------|
| `/forgotPassword` | `/password/forgot` | GET, POST | ✅ Redirected |
| `/otpForgotPassword` | `/password/verify-otp` | GET, POST | ✅ Redirected |
| `/resetPassword` | `/password/reset` | GET, PATCH | ✅ Redirected |
| `/resend-otp` | `/password/resend-otp` | POST | ✅ Redirected |
| `/change-password` | `/password/change` | POST | ✅ Redirected |

### 3. User Management Routes (`/users/*`)
| Old Route | New Route | Method | Status |
|-----------|-----------|---------|---------|
| `/profile` | `/users/profile` | GET, PATCH | ✅ Moved |
| `/profile/image` | `/users/profile/image` | POST | ✅ Moved |
| `/request-email-update` | `/users/profile/email/request` | POST | ✅ Moved |
| `/verify-email-otp` | `/users/profile/email/verify` | POST | ✅ Moved |
| `/resend-email-otp` | `/users/profile/email/resend-otp` | POST | ✅ Moved |
| `/address` | `/users/addresses` | GET, POST | ✅ Moved |
| `/address/:id` | `/users/addresses/:id` | GET, PUT, DELETE | ✅ Moved |
| `/address/:id/default` | `/users/addresses/:id/default` | PATCH | ✅ Moved |
| `/wallet` | `/users/wallet` | GET | ✅ Redirected |
| `/user-coupons` | `/users/coupons` | GET | ✅ Redirected |
| `/referrals` | `/users/referrals` | GET | ✅ Redirected |

### 4. Admin Routes (`/admin/*`)
| Old Route | New Route | Method | Status |
|-----------|-----------|---------|---------|
| `/admin/adminLogin` | `/admin/auth/login` | GET, POST | ✅ Redirected |
| `/admin/adminLogout` | `/admin/auth/logout` | GET | ✅ Redirected |
| `/admin/adminDashboard` | `/admin/dashboard` | GET | ✅ Redirected |
| `/admin/getUsers` | `/admin/users` | GET | ✅ Redirected |
| `/admin/getUsers/:id/block` | `/admin/users/:id/block` | PUT | ✅ Moved |
| `/admin/getUsers/:id/unblock` | `/admin/users/:id/unblock` | PUT | ✅ Moved |
| `/admin/getProducts` | `/admin/products` | GET | ✅ Redirected |
| `/admin/add-product` | `/admin/products/add` | GET | ✅ Moved |
| `/admin/products` | `/admin/products` | POST | ✅ Moved |
| `/admin/products/:id/edit` | `/admin/products/:id/edit` | GET | ✅ Moved |
| `/admin/products/:id` | `/admin/products/:id` | PUT | ✅ Moved |
| `/admin/getOrders` | `/admin/orders` | GET | ✅ Redirected |
| `/admin/orders/:id` | `/admin/orders/:id` | GET, PUT | ✅ Moved |
| `/admin/return-management` | `/admin/returns` | GET | ✅ Redirected |
| `/admin/return-management/:id` | `/admin/returns/:id` | GET, PUT | ✅ Moved |
| `/admin/return-management/bulk-process` | `/admin/returns/bulk-process` | POST | ✅ Moved |

### 5. API Routes (`/api/*`) - New Structure
| Route | Method | Description | Status |
|-------|--------|-------------|---------|
| `/api/cart/add` | POST | Add item to cart | ✅ New |
| `/api/cart/update` | PUT | Update cart item | ✅ New |
| `/api/cart/remove` | DELETE | Remove cart item | ✅ New |
| `/api/cart/clear` | POST | Clear cart | ✅ New |
| `/api/cart/count` | GET | Get cart count | ✅ New |
| `/api/wishlist/toggle` | POST | Toggle wishlist item | ✅ New |
| `/api/wishlist/add-to-cart` | POST | Add wishlist item to cart | ✅ New |
| `/api/wishlist/clear` | POST | Clear wishlist | ✅ New |
| `/api/checkout/apply-coupon` | POST | Apply coupon | ✅ New |
| `/api/checkout/create-payment` | POST | Create payment | ✅ New |
| `/api/checkout/verify-payment` | POST | Verify payment | ✅ New |
| `/api/orders/:id/cancel` | POST | Cancel order | ✅ New |
| `/api/orders/:id/return` | POST | Return order | ✅ New |

## Backward Compatibility

### Automatic Redirects
The following routes automatically redirect to their new locations:
- All authentication routes (`/login` → `/auth/login`)
- All password routes (`/forgotPassword` → `/password/forgot`)
- All admin routes (`/admin/adminLogin` → `/admin/auth/login`)
- User management routes (`/wallet` → `/users/wallet`)

### Preserved Routes
These routes remain unchanged for backward compatibility:
- `/` - Home page
- `/shopPage` - Shop page
- `/products/:id` - Product details
- `/cart` - Cart page
- `/wishlist` - Wishlist page
- `/checkout` - Checkout page
- `/orders` - Orders page
- `/orders/:id` - Order details
- `/contact` - Contact page
- `/about` - About page

## Breaking Changes

### Admin Panel URLs
⚠️ **Important**: Admin panel URLs have changed and will require updates to:
- Bookmarks
- Direct links
- Frontend navigation menus
- Any hardcoded URLs in admin templates

### API Endpoints
🔄 **Migration Required**: Some AJAX endpoints have been moved to `/api/*`:
- Cart operations should use `/api/cart/*`
- Wishlist operations should use `/api/wishlist/*`
- Checkout operations should use `/api/checkout/*`

## Frontend Updates Required

### JavaScript/AJAX Calls
Update the following in your frontend code:

```javascript
// OLD
fetch('/cart/add', { ... })
fetch('/wishlist/toggle', { ... })
fetch('/checkout/apply-coupon', { ... })

// NEW
fetch('/api/cart/add', { ... })
fetch('/api/wishlist/toggle', { ... })
fetch('/api/checkout/apply-coupon', { ... })
```

### Admin Panel Navigation
Update admin sidebar links:

```html
<!-- OLD -->
<a href="/admin/adminDashboard">Dashboard</a>
<a href="/admin/getUsers">Users</a>
<a href="/admin/getProducts">Products</a>

<!-- NEW -->
<a href="/admin/dashboard">Dashboard</a>
<a href="/admin/users">Users</a>
<a href="/admin/products">Products</a>
```

## Implementation Status

### ✅ Completed
- [x] Created hierarchical route modules
- [x] Implemented backward compatibility redirects
- [x] Updated main app.js routing
- [x] Organized authentication routes
- [x] Organized password management routes
- [x] Organized user management routes
- [x] Organized admin routes
- [x] Created API route structure

### 🔄 In Progress
- [ ] Update frontend JavaScript to use new API endpoints
- [ ] Update admin panel navigation links
- [ ] Test all route redirects
- [ ] Update view templates with new route references

### ⏳ Pending
- [ ] Remove legacy route files after migration complete
- [ ] Update documentation and README
- [ ] Performance testing of new route structure
- [ ] SEO impact assessment for changed URLs

## Testing Checklist

### User Routes
- [ ] Home page loads correctly
- [ ] Authentication flow works (signup, login, logout)
- [ ] Password reset flow works
- [ ] User profile management works
- [ ] Shopping cart functionality works
- [ ] Checkout process works
- [ ] Order management works

### Admin Routes
- [ ] Admin login works
- [ ] Admin dashboard loads
- [ ] User management functions work
- [ ] Product management works
- [ ] Order management works
- [ ] Return management works
- [ ] Reports and analytics work

### API Routes
- [ ] Cart API endpoints work
- [ ] Wishlist API endpoints work
- [ ] Checkout API endpoints work
- [ ] Order API endpoints work

## Rollback Plan

If issues arise, the system can be quickly rolled back by:

1. Commenting out the new route system in `app.js`:
```javascript
// app.use("/", routes);

// Restore legacy routes
app.use("/", userRouter);
app.use("/admin", adminRoute);
```

2. The legacy route files remain intact and can be re-enabled immediately.

## Support

For questions or issues related to this migration, please contact the development team or create an issue in the project repository.
