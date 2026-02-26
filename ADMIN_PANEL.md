# Admin Panel Documentation

## Overview

The admin panel provides comprehensive CRUD functionality for managing businesses, subscriptions, and user access. It's accessible at `/admin` and provides full control over the platform.

## Features

### 📊 Dashboard Overview
- **Real-time Statistics**: View total businesses, free vs pro plans, active/inactive subscriptions
- **Quick Actions**: Upgrade businesses to pro, edit details, delete accounts
- **Search & Filter**: Find businesses by name, email, or filter by subscription plan

### 👥 Business Management
- **View All Businesses**: Complete list with subscription status and plan details
- **Edit Business Information**: Update names, emails, subscription plans, and status
- **Delete Businesses**: Remove businesses and all associated data
- **Upgrade to Pro**: One-click upgrade for free plan businesses

### 🔐 Access Control
- **Owner-Only Access**: Only users with owner privileges can access the admin panel
- **Secure Authentication**: Token-based authentication with automatic redirects
- **Role-Based UI**: Admin navigation only appears for owner users

## Setup Instructions

### 1. Environment Configuration

Add your owner email(s) to the environment variables:

```bash
# .env.local
OWNER_EMAILS=your-email@example.com,admin@yourcompany.com
```

### 2. Database Support

The admin panel works with both:
- **Local Database** (JSON file) - for development
- **Supabase** - for production

### 3. Access Requirements

To access the admin panel, a user must:
1. Be logged in with a valid authentication token
2. Have their email listed in `OWNER_EMAILS` environment variable
3. OR have `account_role` set to "owner" in the database

## API Endpoints

### GET `/api/admin/businesses`
- **Purpose**: Fetch all businesses with their subscription details
- **Access**: Owner only
- **Response**: Array of business objects (without password hashes)

### PUT `/api/admin/businesses/[businessId]`
- **Purpose**: Update business information
- **Access**: Owner only
- **Body**: Business update data (name, email, subscription_plan, subscription_status)

### DELETE `/api/admin/businesses/[businessId]`
- **Purpose**: Delete a business and all associated data
- **Access**: Owner only
- **Cascading Deletes**: Bookings, sessions, invoices, templates

### POST `/api/admin/businesses/[businessId]/upgrade`
- **Purpose**: Upgrade a business to pro plan for free
- **Access**: Owner only
- **Effect**: Sets subscription_plan to "pro" and subscription_status to "active"

## Navigation Integration

The admin panel is automatically integrated into the main dashboard navigation:

### Desktop Navigation
- Appears in the sidebar menu for owner users
- Crown icon with purple hover effect
- Positioned between "Embed Widget" and "Account Settings"

### Mobile Navigation
- Available in the mobile menu dialog
- Same styling and functionality as desktop version

## Security Features

### Authentication
- Token-based authentication using existing session system
- Automatic redirect to `/auth` if not logged in
- 403 error for non-owner users attempting access

### Authorization
- Server-side validation on all API endpoints
- `isOwnerBusiness()` function checks both email and role
- Client-side UI hiding for non-privileged users

### Data Protection
- Password hashes never returned in API responses
- Secure token validation on every request
- Proper error handling without information leakage

## Usage Examples

### Upgrading a Business to Pro
1. Navigate to `/admin`
2. Find the business in the list
3. Click the "Upgrade" button (crown icon)
4. Confirm the action
5. Business immediately gets pro access

### Editing Business Details
1. Click the "Edit" button (pencil icon)
2. Modify the desired fields
3. Click "Save Changes"
4. Updates are applied immediately

### Deleting a Business
1. Click the "Delete" button (trash icon)
2. Confirm the deletion in the popup
3. Business and all data are permanently removed

## File Structure

```
src/app/admin/
├── page.jsx                 # Main admin panel component
├── layout.jsx              # Admin layout (server component)
├── middleware.js           # Route protection middleware
└── api/
    └── admin/
        └── businesses/
            ├── route.js                    # GET all businesses
            ├── [businessId]/
            │   ├── route.js               # PUT/DELETE business
            │   └── upgrade/
            │       └── route.js          # POST upgrade to pro
```

## Styling

The admin panel uses the existing design system:
- Tailwind CSS for styling
- Shadcn/ui components for consistency
- Purple accent color for admin-specific elements
- Responsive design for mobile and desktop

## Troubleshooting

### "Admin access required" Error
- Check that your email is in `OWNER_EMAILS` environment variable
- Verify you're logged in with the correct account
- Ensure the environment variables are properly loaded

### Navigation Not Showing
- Confirm the user has owner privileges
- Check that `isOwner` state is properly calculated
- Verify the business data includes correct `account_role`

### API Errors
- Check server logs for detailed error messages
- Verify database connectivity
- Ensure proper authentication headers are being sent

## Future Enhancements

Potential improvements for the admin panel:
- **Bulk Operations**: Select multiple businesses for bulk upgrades/deletions
- **Analytics Dashboard**: Revenue charts, usage statistics, growth metrics
- **User Management**: Direct user creation and password management
- **Audit Logs**: Track all admin actions for compliance
- **Export Features**: CSV/Excel export of business data
- **Email Templates**: Customizable notification templates
- **Subscription Management**: Manual subscription period extensions
