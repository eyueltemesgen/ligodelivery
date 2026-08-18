# Ligo: Bishoftu Delivered

LIGO DELIVERY — MASTER DEVELOPMENT PROMPT

Project Identity

Build a professional, production-ready food, grocery, restaurant, and shop delivery platform called Ligo.

Brand

Platform name: Ligo

Location: Bishoftu, Ethiopia

Developer/Founder: Eyuel Temesgen

Development brand: Eyuel Labs

Role: Founder & Lead Software Engineer

Currency: Ethiopian Birr (ETB)

Primary market: Bishoftu, Ethiopia

The website must look like a real commercial delivery company, not an AI-generated template or school project.

1. CORE PLATFORM STRUCTURE

Ligo has THREE roles:

1. Customer

Customers can:

Register

Login

Manage their account

Upload profile picture

Browse restaurants and shops

Browse products by category

Search products

View shop profiles

View product details

Add products to cart

Change quantities

Remove products

Save delivery addresses

Place orders

Select payment method

Upload payment proof when required

View order status

Track rider/order status

View previous orders

Receive notifications

2. Rider

There is NO merchant portal.

Riders register directly from the main Ligo website.

Riders can:

Register

Login

Create rider profile

Upload profile photo

Provide phone number

Provide basic registration information

Set availability: Online / Offline

Receive delivery assignments

Accept delivery

See pickup location

See customer delivery location

Update delivery status

Share current location

View active deliveries

View completed deliveries

View delivery history

See earnings/history

The rider system should be designed so it can later be converted into a dedicated Android/iOS rider application without rebuilding the backend.

3. Admin

The Admin has COMPLETE control over the platform.

There is no merchant dashboard.

Everything related to restaurants, shops, products, categories, prices, images, orders, riders, customers, and platform settings is controlled by Admin.

2. ADMIN SYSTEM

Create a powerful professional Admin Dashboard.

Admin can:

Dashboard

Display:

Total customers

Total riders

Total shops

Total products

Total orders

Pending orders

Active deliveries

Completed deliveries

Cancelled orders

Today's revenue

Weekly revenue

Monthly revenue

Use professional charts and statistics.

3. SHOP MANAGEMENT

Admin can create and manage shops.

Admin can:

Add shop

Edit shop

Delete/deactivate shop

Upload shop profile image

Upload shop cover image

Add shop name

Add description

Add phone number

Add location

Add address

Select shop category

Set opening hours

Set closing hours

Enable/disable shop

Mark shop as featured

View shop orders

Example categories:

Restaurants

Cafes

Grocery

Supermarket

Bakery

Pharmacy

Electronics

Clothing

Cosmetics

Other

The category system must be dynamic so Admin can create new categories.

4. PRODUCT MANAGEMENT

Admin controls every product.

Admin can:

Add product

Edit product

Delete product

Disable product

Upload product image

Change product image

Set product name

Add description

Set price

Edit price

Set discount

Set stock availability

Select category

Select shop

Mark product as featured

Mark product as popular

Each product belongs to:

SHOP → CATEGORY → PRODUCT

Example:

Restaurant A
→ Fast Food
→ Burger
→ 250 ETB

Shop B
→ Grocery
→ Milk
→ 90 ETB

5. CATEGORY MANAGEMENT

Admin can:

Create categories

Edit categories

Delete categories

Upload category image/icon

Reorder categories

Enable/disable categories

The customer homepage should automatically display categories created by Admin.

6. CUSTOMER WEBSITE

Create a beautiful modern customer-facing website.

Homepage should contain:

Header

Ligo logo

Location selector

Search bar

Categories

Restaurants

Shops

Offers

Track Order

Login/Register

Cart

Use a professional delivery-company style.

Do NOT make it look like an AI-generated website.

Use realistic spacing, typography, icons, shadows, cards, buttons, and responsive layouts.

7. HERO SECTION

Create a strong Bishoftu-focused hero section.

Example concept:

"Your City. Your Food. Your Delivery."

Supporting text:

"Discover restaurants, shops, groceries and more in Bishoftu — delivered to your door."

Buttons:

Order Now

Explore Shops

Use attractive food/shop imagery.

8. SHOP DISCOVERY

Customers can browse:

All Shops

Restaurants

Grocery

Cafes

Bakeries

Supermarkets

Other categories

Each shop card should show:

Shop image

Shop name

Category

Rating

Estimated delivery time

Delivery fee

Open/Closed status

9. PRODUCT PAGE

Product cards should look professional.

Display:

Product image

Product name

Description

Price in ETB

Discount if available

Shop name

Add to Cart button

Product details page should include a large image and clear purchase interface.

10. CART

Create a professional shopping cart.

Display:

Product

Product image

Quantity controls

Price

Subtotal

Delivery fee

Discount

Total

Buttons:

Continue Shopping

Checkout

11. CHECKOUT

Checkout must be simple and trustworthy.

Customer enters/selects:

Full name

Phone number

Delivery address

Delivery instructions

Location

Payment method

Show complete order summary.

12. LOCAL ETHIOPIAN PAYMENT SYSTEM

Do NOT depend on Chapa.

Ligo should support a manual/local payment workflow initially.

Payment options should include:

Telebirr

Customer sees the official Ligo Telebirr payment information configured by Admin.

CBE

Customer sees the official Ligo CBE payment information configured by Admin.

BOA

Customer sees the official Ligo BOA payment information configured by Admin.

IMPORTANT SECURITY REQUIREMENT:

Do NOT hard-code real account numbers, phone numbers, or sensitive payment information inside the frontend source code.

Instead create:

ADMIN → SETTINGS → PAYMENT SETTINGS

Admin can securely configure:

Telebirr payment account

CBE payment account

BOA payment account

Account holder name

Payment instructions

Only the necessary payment information should be displayed to customers.

13. PAYMENT PROOF

For manual payments:

After the customer makes payment:

Customer selects payment method.

Customer sees payment instructions.

Customer makes payment externally.

Customer uploads payment receipt/screenshot.

Customer submits order.

Order becomes:

"PENDING PAYMENT VERIFICATION"

Admin receives notification.

Admin can:

Approve payment

Reject payment

Request another receipt

After approval:

PAYMENT VERIFIED

Then the order moves to:

ORDER CONFIRMED

Never automatically mark a manual payment as successful without Admin verification.

14. ORDER SYSTEM

Order statuses:

Pending

Payment Verification

Confirmed

Preparing

Ready for Pickup

Rider Assigned

Picked Up

On the Way

Delivered

Cancelled

Customer should see the order status visually.

Use a timeline:

ORDER PLACED
↓
PAYMENT VERIFIED
↓
ORDER CONFIRMED
↓
PREPARING
↓
RIDER ASSIGNED
↓
PICKED UP
↓
ON THE WAY
↓
DELIVERED

15. RIDER ASSIGNMENT

Admin can see available riders.

Admin can assign a rider to an order.

Display:

Rider name

Profile photo

Phone

Online/offline status

Current location

Active delivery count

Admin can reassign a delivery if necessary.

16. REAL-TIME TRACKING

Build real-time delivery tracking.

Customer should be able to see:

Rider location

Delivery destination

Order status

Estimated delivery time

Rider shares location while active.

Admin can see:

Active riders

Rider locations

Active orders

Delivery routes

Use WebSockets/Socket.IO for real-time updates.

Use:

Leaflet

OpenStreetMap

GPS/browser geolocation

WebSocket updates

Do not pretend GPS is real-time if the browser/device has not provided location permission.

17. MAP

Create professional maps for Bishoftu.

Use:

Leaflet.js

OpenStreetMap

Features:

Customer location

Rider location

Shop location

Delivery destination

Route visualization

Allow customers to select their delivery location from the map.

18. CUSTOMER ACCOUNT

Customer profile should contain:

Profile picture

Full name

Phone number

Email

Saved addresses

Order history

Active order

Favorite shops/products

Notification settings

19. RIDER ACCOUNT

Rider profile:

Profile picture

Full name

Phone

Rider status

Registration date

Active delivery

Completed deliveries

Delivery history

Earnings/history

Admin must approve riders before they can receive deliveries.

20. REGISTRATION

Main website should have:

Customer Registration

Full name

Phone

Email optional

Password

Address

Rider Registration

Full name

Phone

Email optional

Password

Address

Profile picture

Rider registration information

After registration, rider appears in Admin Dashboard.

Do NOT automatically grant rider delivery access until Admin approval.

21. AUTHENTICATION & SECURITY

Implement:

Secure password hashing

Session/JWT authentication

Role-based access control

Admin authentication

Protected admin routes

Protected rider routes

Protected customer routes

Input validation

Rate limiting

Secure file upload

Image type validation

File size limits

Server-side authorization

NEVER trust frontend role information.

The backend must verify permissions.

22. ADMIN SECURITY

Admin dashboard must be completely private.

Only authorized administrators can access it.

Admin should be able to:

Manage customers

Manage riders

Manage shops

Manage products

Manage categories

Manage orders

Manage payments

Manage platform settings

Manage delivery fees

Manage payment methods

Manage banners

Manage featured products

Manage notifications

23. DESIGN

The design must feel like a real startup/company.

Brand:

LIGO

Use a clean modern delivery identity.

Recommended visual direction:

Fresh green primary color

White backgrounds

Dark text

Soft gray sections

Green CTA buttons

Rounded cards

Professional shadows

High-quality food/shop imagery

Clean typography

Real-looking icons

Do NOT overuse gradients.

Do NOT use excessive glassmorphism.

Do NOT make every component rounded like an AI template.

Do NOT use fake statistics.

Do NOT use placeholder-looking UI.

The final product should look like a real Ethiopian delivery company.

24. RESPONSIVE DESIGN

The website must work perfectly on:

Desktop

Laptop

Tablet

Android phones

iPhone

Mobile navigation should use a professional bottom navigation/header system.

25. SEARCH

Implement global search.

Customer can search:

Shops

Products

Categories

Example:

"burger"

Results should show matching products and shops.

26. OFFERS

Admin can create offers.

Admin can:

Add discount

Set percentage discount

Set fixed discount

Set start date

Set end date

Select shop

Select products

Enable/disable offer

Customer sees offers on homepage.

27. NOTIFICATIONS

Implement notifications for:

Customer:

Order received

Payment verified

Order confirmed

Preparing

Rider assigned

Rider picked up

Rider nearby

Delivered

Rider:

New delivery assigned

Order cancelled

Delivery updated

Admin:

New customer

New rider registration

New order

Payment submitted

Payment verification required

Delivery completed

28. ADMIN ORDER MANAGEMENT

Create a professional order-management table.

Columns:

Order ID

Customer

Shop

Total

Payment

Rider

Status

Date

Actions

Admin can open an order and see everything.

29. DATABASE

Design a proper relational database.

Suggested tables:

users
customers
riders
admins
shops
categories
products
product_images
orders
order_items
payments
payment_proofs
addresses
rider_locations
notifications
offers
settings

Use proper relationships and indexes.

Never store passwords in plain text.

30. IMAGE STORAGE

Product and shop images should not be stored as huge raw files inside the database.

Use proper file/object storage architecture.

Validate:

MIME type

File extension

Maximum size

Image dimensions

Generate optimized versions/thumbnails where appropriate.

31. TECH STACK

Use a modern maintainable architecture.

Recommended:

Frontend:

React

TypeScript

Tailwind CSS

Backend:

Node.js

Express

TypeScript

Database:

PostgreSQL

Real-time:

Socket.IO

Maps:

Leaflet

OpenStreetMap

Authentication:

Secure HTTP-only cookies or secure JWT architecture

Image storage:

S3-compatible storage or Cloudinary-style object storage

Charts:

Recharts or Chart.js

Icons:

Lucide Icons or another professional icon library

32. API ARCHITECTURE

Create clean REST APIs.

Example:

/api/auth
/api/customers
/api/riders
/api/shops
/api/categories
/api/products
/api/orders
/api/payments
/api/notifications
/api/admin
/api/settings

Use proper HTTP status codes.

Return consistent JSON responses.

33. ADMIN CONTROL FLOW

The complete business flow should be:

ADMIN CREATES CATEGORY
↓
ADMIN CREATES SHOP
↓
ADMIN UPLOADS SHOP IMAGE
↓
ADMIN ADDS PRODUCTS
↓
ADMIN UPLOADS PRODUCT IMAGES
↓
ADMIN SETS PRICES
↓
PRODUCTS APPEAR ON CUSTOMER WEBSITE
↓
CUSTOMER ORDERS
↓
CUSTOMER PAYS LOCALLY
↓
CUSTOMER UPLOADS PAYMENT PROOF
↓
ADMIN VERIFIES PAYMENT
↓
ADMIN CONFIRMS ORDER
↓
ADMIN ASSIGNS RIDER
↓
RIDER ACCEPTS
↓
RIDER PICKS UP ORDER
↓
CUSTOMER TRACKS RIDER
↓
RIDER DELIVERS
↓
ORDER COMPLETED

34. IMPORTANT: NO MERCHANT PORTAL

Do NOT build:

Merchant login

Merchant dashboard

Merchant product management

Merchant order dashboard

The Admin handles all merchant/shop operations.

This keeps the first version simple and gives Ligo centralized control.

35. FUTURE ARCHITECTURE

Build the backend so that later Ligo can add:

Dedicated Rider Android app

Dedicated Customer Android app

Online payment APIs

SMS OTP

Push notifications

Ratings/reviews

Restaurant analytics

Delivery zones

Automatic rider assignment

Promo codes

Loyalty points

Multiple cities

Multiple administrators

Advanced analytics

Do not build the architecture in a way that makes these future features difficult.

36. HOMEPAGE SECTIONS

The customer homepage should contain:

Header

Location selector

Hero section

Search

Categories

Popular shops

Popular products

Special offers

Recently added shops

How Ligo works

Become a Ligo Rider

Customer testimonials

App-coming-soon section

Footer

37. FOOTER

Include:

Ligo

"Fast, simple delivery in Bishoftu."

Links:

About

Contact

Help

Terms

Privacy

Become a Rider

Track Order

Contact information should be configurable through Admin Settings.

38. BRAND EXPERIENCE

Ligo should feel:

Fast

Reliable

Local

Modern

Friendly

Professional

Ethiopian

The design should communicate that Ligo is built specifically for Bishoftu rather than being a generic international template.

39. DEVELOPMENT QUALITY

Do not generate a fake prototype.

Build a functioning application.

Requirements:

Working authentication

Working database

Working CRUD

Working image uploads

Working cart

Working checkout

Working orders

Working payment-proof system

Working admin dashboard

Working rider system

Working real-time order updates

Working map

Working role permissions

Responsive UI

Error handling

Loading states

Empty states

Form validation

Do not leave buttons that do nothing.

Do not use fake API calls.

Do not use fake login.

Do not hard-code products into the frontend.

Everything must come from the database.

40. ENVIRONMENT VARIABLES

All secrets must be stored in environment variables.

Examples:

DATABASE_URL=
JWT_SECRET=
SESSION_SECRET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
MAP_API_KEY=

Payment account information must also be stored securely and must NEVER be committed to GitHub.

Create a secure Admin Payment Settings interface instead of putting sensitive payment information into frontend source code.

41. PROJECT STRUCTURE

Use a clean scalable structure similar to:

ligo/
├── client/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── layouts/
│ │ ├── hooks/
│ │ ├── services/
│ │ ├── contexts/
│ │ ├── assets/
│ │ └── utils/
│
├── server/
│ ├── src/
│ │ ├── controllers/
│ │ ├── routes/
│ │ ├── models/
│ │ ├── middleware/
│ │ ├── services/
│ │ ├── sockets/
│ │ ├── utils/
│ │ └── config/
│
├── uploads/
├── database/
├── .env.example
├── package.json
└── README.md

42. FINAL REQUIREMENT

Before considering the project complete, test every major flow:

CUSTOMER:
Register → Login → Browse → Search → Product → Cart → Checkout → Payment Proof → Order → Tracking

RIDER:
Register → Admin Approval → Login → Online → Assignment → Accept → Pickup → Delivery → Complete

ADMIN:
Login → Dashboard → Category → Shop → Product → Price → Image → Order → Payment Verification → Rider Assignment → Tracking

Fix every broken button, route, API request, database relationship, validation error, responsive problem, and permission issue.

The final Ligo platform must feel like a real production delivery business operating in Bishoftu, Ethiopia, not a demonstration project.

Brand the application as:

LIGO

Fast. Local. Delivered.

Developer:
Eyuel Temesgen
Founder & Lead Software Engineer — Eyuel Labs

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ligodelivery.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/086e7504-f70f-48b2-a256-bcade66abdb8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
