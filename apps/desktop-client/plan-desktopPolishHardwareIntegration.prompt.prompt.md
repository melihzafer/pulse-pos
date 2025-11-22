## Plan: Desktop Polish & Hardware Integration

We will finalize the Desktop POS by connecting the receipt printer, improving user feedback with toast notifications, and adding essential configuration options.

### Steps
1. Expose the `printReceipt` function via Electron IPC in `preload.ts` and `main.ts`.
2. Update `POSScreen.tsx` to trigger the printer automatically after a successful payment.
3. Install `sonner` (toast library) and replace all `alert()` calls with professional success/error notifications.
4. Add "Tax Rate" and "Receipt Header" fields to `SettingsScreen.tsx` and persist them in `localStorage`.

### Further Considerations
1. **Mobile App**: Should we switch focus to the Mobile App (Barcode Scanner) after this?
2. **Cloud Sync**: Do you want to configure the Supabase connection/Authentication next?
