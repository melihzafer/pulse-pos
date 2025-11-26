# Cashier Management & Authentication System

## Overview

A complete cashier authentication and management system has been implemented for Pulse POS, including role-based access control, PIN-based login, and a management interface for administrators.

## Features Implemented

### 1. **Authentication System**
- **Login Screen** with username + PIN authentication (4-6 digits)
- **Session Management** using Zustand with persistent storage
- **Auto-login** if session is valid
- **Logout Functionality** with session clearing

### 2. **Cashier Management**
- **Add Cashiers**: Create new cashier accounts with username, PIN, full name, and role
- **Edit Cashiers**: Update cashier information (PIN update optional)
- **Delete Cashiers**: Soft delete (mark as _deleted)
- **Active/Inactive Status**: Control whether cashiers can log in
- **Role-Based Access**: Admin, Manager, Cashier roles

### 3. **Role System**
- **Admin**: Full system access (purple badge)
- **Manager**: Management permissions (blue badge)
- **Cashier**: Basic POS operations (gray badge)

### 4. **POS Integration**
- **Cashier Display**: Shows logged-in cashier info in POS header with avatar
- **Role Badge**: Visual indicator of cashier role
- **Required Authentication**: Cannot access POS without login

### 5. **Multi-Language Support**
- English, Turkish, and Bulgarian translations
- All UI text localized

## Database Schema

### `cashiers` Table (Version 7)
```typescript
{
  id: string;                    // UUID
  workspace_id: string;          // Workspace reference
  username: string;              // Unique username
  pin_code: string;              // 4-6 digit PIN
  full_name: string;             // Display name
  is_active: boolean;            // Can login
  role: 'admin' | 'manager' | 'cashier';
  created_at: string;            // ISO timestamp
  _synced?: boolean;             // Sync status
  _dirty?: boolean;              // Needs sync
  _deleted?: boolean;            // Soft delete
}
```

## Usage

### First-Time Setup
1. **Default Admin Account** is automatically created:
   - Username: `admin`
   - PIN: `1234`
   - Role: Admin
   - Full Name: Administrator

2. On first launch, you'll see the login screen

3. Login with default credentials

### Managing Cashiers
1. Navigate to **Settings** tab
2. Scroll to **Cashier Management** section
3. Click **Add Cashier** button
4. Fill in the form:
   - Username (required, unique)
   - PIN Code (4-6 digits, required for new cashiers)
   - Full Name (required)
   - Role (Admin/Manager/Cashier)
   - Active status checkbox
5. Click **Create** or **Save**

### Editing Cashiers
1. Click the **Edit** button (pencil icon) on a cashier card
2. Modify fields as needed
3. Leave PIN empty to keep current PIN
4. Click **Save**

### Deleting Cashiers
1. Click the **Delete** button (trash icon) on a cashier card
2. Confirm deletion
3. Cashier is soft-deleted (can be restored from database)

### Logging Out
- Click the **Logout** button (door icon) in the sidebar
- Session is cleared and you're returned to login screen

## File Structure

```
apps/desktop-client/src/
├── features/
│   ├── auth/
│   │   └── LoginScreen.tsx              # Login interface
│   ├── settings/
│   │   └── CashierManagement.tsx        # Cashier CRUD interface
│   └── pos/
│       └── POSScreen.tsx                # Updated with cashier display
├── layouts/
│   └── Sidebar.tsx                       # Updated with logout
├── App.tsx                               # Auth gate added
└── locales/
    ├── en.json                           # English translations
    ├── tr.json                           # Turkish translations
    └── bg.json                           # Bulgarian translations

packages/core-logic/src/
├── database/
│   └── dexieDb.ts                        # Added cashiers table (v7)
└── store/
    └── authStore.ts                      # Authentication state
```

## Translation Keys

### Authentication (`auth`)
- `welcome`, `loginPrompt`, `username`, `pin`, `signIn`, `signingIn`
- `usernameRequired`, `pinRequired`, `pinLength`, `invalidCredentials`
- `loginError`, `loginSuccess`, `contactAdmin`

### Cashiers (`cashiers`)
- `title`, `subtitle`, `addNew`, `addNewCashier`, `editCashier`
- `username`, `pinCode`, `fullName`, `role`, `activeStatus`
- `active`, `inactive`, `create`, `createSuccess`, `updateSuccess`
- `deleteSuccess`, `deleteConfirm`, `loadError`, `saveError`
- `role.admin`, `role.manager`, `role.cashier`

## Security Features

1. **PIN Storage**: Currently stored as plain text (TODO: Add hashing)
2. **Session Persistence**: Stored in localStorage with `zustand/persist`
3. **Soft Deletes**: Cashiers marked as `_deleted` instead of hard delete
4. **Active Status**: Inactive cashiers cannot log in
5. **Unique Usernames**: Duplicate detection on create

## Future Enhancements

- [ ] PIN code hashing (bcrypt)
- [ ] Failed login attempt tracking
- [ ] Account lockout after X failed attempts
- [ ] Password reset flow
- [ ] Audit log for cashier actions
- [ ] Permission-based UI hiding (based on role)
- [ ] Two-factor authentication (optional)
- [ ] Session timeout with auto-logout
- [ ] Biometric authentication (fingerprint)
- [ ] Employee photos/avatars

## Testing Checklist

- [x] Login with default admin credentials
- [x] Create new cashier (all roles)
- [x] Edit existing cashier (change name, role, status)
- [x] Update cashier PIN
- [x] Delete cashier
- [x] Login with new cashier account
- [x] Logout and return to login screen
- [x] Inactive cashier cannot login
- [x] Cashier info displays in POS header
- [x] All translations work (EN/TR/BG)
- [x] Duplicate username prevention
- [x] PIN validation (4-6 digits, numeric only)
- [x] Session persists after page refresh

## Known Issues

- Analytics screen components still missing (unrelated to auth)
- PIN stored as plain text (security concern for production)
- No password recovery mechanism yet

## Notes

- Default admin account is created automatically on first run
- Cashier management is only accessible in Settings tab
- All cashiers share the same workspace (multi-workspace not yet implemented)
- Logout button is in the sidebar (bottom left, red icon)
