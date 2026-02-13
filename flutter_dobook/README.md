# DoBook (Flutter)

Mobile version of the DoBook booking system (ported from the web app).

## What’s included
- Business auth: register + login (local)
- Business dashboard: bookings list + calendar view
- Create bookings (in-app)
- Public booking form (customer-style flow using `businessId`)
- Business settings: profile + bank details + logo upload
- Invoice PDF preview/share/print

## Data storage
The app persists to a JSON file named `localdb.json` stored in the app’s documents directory (similar to `apps/web/localdb.json`).

## Run
- `flutter pub get`
- `flutter run`

## Notes
- This app is “fully integrated” in the sense that it runs without a separate backend; everything is local on-device.
- If you want multi-device sync or a hosted backend, say what you’re using (Firebase/Supabase/custom API) and I can wire the repository to it.
