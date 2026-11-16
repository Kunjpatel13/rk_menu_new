# Restaurant WhatsApp Ordering Website

A static customer menu + single-admin dashboard using HTML, CSS, vanilla JavaScript, Bootstrap 5 and Supabase. Customer checkout opens WhatsApp with a pre-filled order; the customer must press Send.

## Included
- Responsive customer menu, category filters, search and Veg/Non-Veg filter
- Cart with quantity controls and LocalStorage persistence
- Customer details form and generated order reference
- WhatsApp Click-to-Chat checkout
- Supabase single-admin authentication
- Admin dashboard with menu/category CRUD and restaurant settings
- Supabase Storage image upload
- Realtime menu/category/settings refresh on customer page
- SQL schema and Row Level Security policies

## 1. Create Supabase project
1. Create a free project at https://supabase.com/.
2. Open SQL Editor and run `supabase-setup.sql`.
3. In Authentication > Users, create one admin user with email and password. Do not build public sign-up.
4. Copy that user's UUID.
5. In SQL Editor run:
   `insert into public.admin_users (user_id) values ('PASTE-ADMIN-UUID-HERE');`
6. Open Project Settings > API. Copy Project URL and anon/public key.
7. Paste both into `js/config.js`. Never use the service_role key in browser code.

## 2. Configure restaurant
1. Open `js/config.js`; change the default restaurant name and fallback WhatsApp number.
2. Deploy the website, open `/admin/login.html`, and sign in with the admin account.
3. In Restaurant settings, enter the WhatsApp number with country code, e.g. `919876543210` (digits only), address, hours and delivery charge.
4. Add categories and menu items from the dashboard.
5. Customer website loads the menu from Supabase and listens for realtime updates.

## 3. Run locally
Because the project uses browser modules/CDNs and Supabase, serve it through a local web server rather than opening the HTML file directly.
- VS Code: install Live Server, right-click `index.html`, choose Open with Live Server.
- Or use Python from the project folder: `python -m http.server 8000`, then visit `http://localhost:8000`.

## 4. Deploy to Netlify
1. Create a GitHub repository and upload the project, or drag the project folder into Netlify's manual deploy area.
2. Set the publish directory to the project root.
3. Deploy. No build command is needed.
4. Test the customer page and `/admin/login.html`.

## Important limitations and security
- This is a WhatsApp-only checkout. It does NOT save orders to a database and cannot know whether a customer pressed Send.
- The generated order ID is a client-side reference, not a globally guaranteed unique ID.
- Cart is stored in the customer's browser.
- Public visitors can read available menu items and public restaurant settings. Admin write access is enforced with Supabase Auth + RLS.
- Supabase anon/public key is expected in frontend; service_role key must never be exposed.
- For production, consider server-side order creation, server-validated pricing, backups, privacy notice/consent, and paid service limits if traffic grows.
- Uploaded replacement images are not automatically deleted from Storage when a menu item is removed; periodically clean up unused files in Supabase Storage.
- Configure Supabase Auth allowed redirect URLs for your local and deployed site if required by your project settings.
