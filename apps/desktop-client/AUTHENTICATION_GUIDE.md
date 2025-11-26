# Pulse POS Authentication Guide

## Overview
Pulse POS now includes a complete cashier authentication system with role-based access control.

## Default Cashier Accounts

After running the database seed (see instructions below), you'll have access to two default accounts:

### Admin Account
- **Username:** `admin`
- **PIN:** `1234`
- **Role:** Admin
- **Full Name:** Admin User
- **Permissions:** Full system access

### Cashier Account
- **Username:** `cashier1`
- **PIN:** `5678`
- **Role:** Cashier
- **Full Name:** Mehmet Yılmaz
- **Permissions:** POS operations, basic customer management

## Database Setup

### First Time Setup / Reset Database

To load the default cashier accounts, you need to reset your database:

1. **Open the application** in your browser (usually `http://localhost:5173`)
2. **Press F12** to open Developer Tools
3. **Click Console tab**
4. **Paste and run** the following command:

```javascript
localStorage.clear(); indexedDB.deleteDatabase('PulseDB'); location.reload();
```

This will:
- Clear all local storage
- Delete the IndexedDB database
- Reload the page
- Automatically seed the database with:
  - 23 sample products
  - 5 sample customers (with store credit)
  - 2 cashiers (admin + cashier1)

## Login Screen

The login screen appears automatically when no user is authenticated. It features:

- **Username field**: Enter your username (case-insensitive)
- **PIN field**: Enter your 4-6 digit PIN code
- **Validation**: Automatic validation of PIN format
- **Error messages**: Clear feedback for invalid credentials
- **Persist login**: Authentication state is saved locally

## Features

### Authentication Store (authStore)
Located in: `packages/core-logic/src/store/authStore.ts`

Key features:
- Persistent authentication state using Zustand
- Secure PIN-based login
- Role-based access control ready
- Current cashier tracking

### Login Screen
Located in: `apps/desktop-client/src/features/auth/LoginScreen.tsx`

Features:
- Modern glass-panel design
- Real-time PIN validation
- Error handling with user-friendly messages
- Internationalization support (EN, TR, BG)
- Auto-focus on PIN input after username entry

### Seed Data
Located in: `apps/desktop-client/src/utils/seedData.ts`

Includes:
```typescript
const SAMPLE_CASHIERS = [
  {
    username: 'admin',
    pin_code: '1234',
    full_name: 'Admin User',
    role: 'admin',
    is_active: true
  },
  {
    username: 'cashier1',
    pin_code: '5678',
    full_name: 'Mehmet Yılmaz',
    role: 'cashier',
    is_active: true
  }
];
```

## Security Features

- **PIN Validation**: Only 4-6 digit numeric PINs are accepted
- **Active Status Check**: Only active cashiers can login
- **Deleted Check**: Soft-deleted cashiers cannot login
- **Case-insensitive username**: Usernames are matched case-insensitively
- **Local Storage Encryption**: Authentication state persists securely

## Current Implementation Status

✅ **Completed:**
- Cashier database schema (Dexie v7)
- Authentication store with login/logout
- Login screen UI with validation
- Default admin and cashier accounts
- Seed data integration
- Persistent authentication state

⏸️ **Planned (Phase 6):**
- Password-based login option
- Role-based UI restrictions
- Permission system
- Employee management screen
- Audit logging
- Session timeout

## Testing the Authentication

1. **Reset the database** (see Database Setup section above)
2. **Login with admin account:**
   - Username: `admin`
   - PIN: `1234`
3. **You should see:** Success toast and be redirected to POS screen
4. **Check current user:** Look for cashier name in the app (usually in POSScreen)

## Adding New Cashiers

Currently, new cashiers are added by:
1. Adding them to `SAMPLE_CASHIERS` array in `seedData.ts`
2. Running database reset

**Future Enhancement:** A cashier management screen will allow admins to add/edit/delete cashiers through the UI.

## Troubleshooting

### Login Failed - "Invalid username or PIN"
- Double-check username spelling (case doesn't matter)
- Ensure PIN is exactly 4-6 digits
- Make sure you've run the database reset command
- Check browser console (F12) for detailed error logs

### No Cashiers in Database
- Run the database reset command
- Check console for seed success messages:
  ```
  ✅ Seeded 2 cashiers
  ```

### Database Version Conflicts
If you see Dexie schema errors:
1. Close all browser tabs with the app
2. Run: `indexedDB.deleteDatabase('PulseDB')`
3. Refresh the page

## Development Notes

### Database Schema (v7)
```typescript
interface Cashier {
  id: string;
  workspace_id: string;
  username: string;
  pin_code: string;
  full_name: string;
  is_active: boolean;
  role: 'admin' | 'manager' | 'cashier';
  created_at: string;
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}
```

### Indexed Fields
```typescript
cashiers: 'id, workspace_id, username, is_active, role, *_synced, *_dirty, *_deleted'
```

### Future Enhancements
- Email/password login option
- Two-factor authentication
- Biometric authentication (fingerprint/face)
- PIN expiry and rotation
- Login attempt limiting
- Session timeout
- Multi-workspace support

## Related Files

- **Auth Store:** `packages/core-logic/src/store/authStore.ts`
- **Login Screen:** `apps/desktop-client/src/features/auth/LoginScreen.tsx`
- **Seed Data:** `apps/desktop-client/src/utils/seedData.ts`
- **Database Schema:** `packages/core-logic/src/database/dexieDb.ts`
- **Types:** `packages/core-logic/src/types/schema.ts`

## Support

For issues or questions:
1. Check browser console for error logs
2. Verify database seed completed successfully
3. Check that cashiers table exists in IndexedDB
4. Review this guide's troubleshooting section
