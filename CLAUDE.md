# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Villa Manager is a Next.js 14 application for villa/property rental management. It's a full-stack application with booking management, expense tracking, financial reporting, and multi-language support (English/Albanian).

## Key Technologies

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS with custom components
- **Testing**: Jest + React Testing Library + Playwright
- **PDF Generation**: React-PDF
- **Calendar**: FullCalendar
- **Charts**: Recharts
- **i18n**: Next-i18next

## Project Structure

```
src/
├── app/[lang]/              # Language-prefixed routes
│   ├── (auth)/             # Authentication routes (login)
│   └── (app)/              # Protected application routes
│       ├── dashboard/      # Main dashboard
│       ├── bookings/       # Booking management
│       ├── expenses/       # Expense tracking
│       ├── revenue/        # Revenue reports
│       └── settings/       # Application settings
├── components/             # Reusable components
│   ├── ui/                 # Radix UI shadcn components
│   ├── bookings/           # Booking-specific components
│   ├── revenue/            # Revenue-specific components
│   └── shared/             # Shared layout components
├── lib/                    # Business logic and utilities
│   ├── actions/            # Server actions (Supabase)
│   ├── pdf/                # PDF generation components
│   └── supabase/           # Supabase client/middleware
```

## Commands

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
```

### Testing
```bash
npm run test             # Run Jest tests
npm run test:watch       # Watch mode
npm run test:e2e         # Run Playwright e2e tests
npm run test:coverage    # Generate coverage report
npm run test:components  # Test components only
npm run test:api         # Test API/lib only
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run build:quiet      # Build without linting
```

## Environment Setup

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Key Architecture Points

1. **Internationalization**: Uses Next.js i18n with locale subpaths (`/en/dashboard`, `/sq/dashboard`)
2. **Authentication**: Protected routes via middleware, Supabase Auth with CSRF protection
3. **Database**: Strongly typed with `database.types.ts` for full TypeScript support
4. **Server Actions**: All database operations use Next.js server actions
5. **Security**: CSRF tokens, security-focused ESLint rules, input sanitization
6. **Caching**: Custom cache handler for production builds

## Important Files

- `src/middleware.ts` - Locale detection, auth protection, CSRF handling
- `src/lib/database.types.ts` - TypeScript definitions for Supabase
- `src/lib/supabase/middleware.ts` - Auth checking utility
- `src/lib/csrf.ts` - CSRF token management
- `next.config.js` - Production optimizations, i18n configuration

## Testing Strategy

- **Unit**: Jest + React Testing Library for components and utilities
- **E2E**: Playwright for critical user flows
- **Security**: Dedicated security test suite

## Database Schema

Core tables: `bookings`, `expenses`, `villas`, `profiles`, `revenue` with full TypeScript integration via generated types.