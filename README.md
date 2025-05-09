# Villa Manager
## Overview
Villa Manager is a Next.js application designed to help villa owners and property managers efficiently manage their rental properties. The application provides tools for booking management, expense tracking, and financial reporting.

## Features
- Booking Management : Create, view, and manage guest bookings
- Expense Tracking : Record and categorize property expenses
- Financial Reporting : Generate revenue reports and analyze profitability
- User Authentication : Secure login and user management
- Multi-language Support : Available in English and Albanian
## Technology Stack
This is a Next.js project bootstrapped with create-next-app .

- Frontend : Next.js with React and TypeScript
- Styling : Tailwind CSS
- Backend & Database : Supabase
- Authentication : Supabase Auth
- File Storage : Supabase Storage
- Fonts : Geist via next/font
## Supabase Integration
### Database Structure
The application uses Supabase as its backend with the following table structure:

1. profiles
   
   - id : UUID (references auth.users)
   - email : String
   - full_name : String
   - avatar_url : String (optional)
   - created_at : Timestamp
   - updated_at : Timestamp
2. villas
   
   - id : UUID
   - name : String
   - address : String
   - owner_id : UUID (references profiles.id)
   - created_at : Timestamp
3. bookings
   
   - id : UUID
   - villa_id : UUID (references villas.id)
   - guest_name : String
   - guest_email : String
   - guest_phone : String
   - check_in_date : Date
   - check_out_date : Date
   - total_amount : Decimal
   - status : Enum ('confirmed', 'pending', 'cancelled')
   - notes : Text
   - created_at : Timestamp
   - updated_at : Timestamp
4. expenses
   
   - id : UUID
   - villa_id : UUID (references villas.id)
   - amount : Decimal
   - description : String
   - category : String
   - date : Date
   - created_at : Timestamp
5. revenue
   
   - id : UUID
   - villa_id : UUID (references villas.id)
   - booking_id : UUID (references bookings.id)
   - amount : Decimal
   - date : Date
   - created_at : Timestamp
### Authentication
The application uses Supabase Auth for user authentication with:

- Email/password login
- Social login options
- Role-based access control
### Storage
Supabase Storage is used for:

- User profile images
- Villa photos and documentation
## Getting Started

First, run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
Open http://localhost:3000 with your browser to see the result.

You can start editing the page by modifying app/page.tsx . The page auto-updates as you edit the file.

## Environment Setup
Create a .env.local file with the following variables:

plaintext

Open Folder

1

2

NEXT_PUBLIC_SUPABASE_URL=your_supabase_u

rl

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supab

ase_anon_key

## Learn More
To learn more about Next.js, take a look at the following resources:

- Next.js Documentation - learn about Next.js features and API.
- Learn Next.js - an interactive Next.js tutorial.
You can check out the Next.js GitHub repository - your feedback and contributions are welcome!

## Deploy on Vercel
The easiest way to deploy your Next.js app is to use the Vercel Platform from the creators of Next.js.

Check out our Next.js deployment documentation for more details.