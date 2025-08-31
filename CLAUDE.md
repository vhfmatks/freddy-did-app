# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital Information Display (DID) system for store order notifications built with Next.js 15 and Supabase.

## Initial Setup Commands

```bash
# Create Next.js 15 project
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Install Supabase dependencies
npm install @supabase/supabase-js @supabase/ssr

# Install authentication dependencies  
npm install next-auth @next-auth/supabase-adapter

# Development server
npm run dev

# Build for production
npm run build

# Run production server
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Architecture Overview

### Core Technologies
- **Next.js 15** with App Router for SSR/SSG
- **Supabase** for backend (Auth, Database, Realtime, Storage)
- **PostgreSQL** via Supabase
- **TypeScript** for type safety
- **Tailwind CSS** for styling

### Authentication Flow
1. Google OAuth via Supabase Auth
2. Protected routes using middleware
3. Row Level Security (RLS) for data isolation
4. Admin-only access control

### Key Directories Structure
```
/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication routes
│   │   ├── login/         # Login page
│   │   └── callback/      # OAuth callback
│   ├── (protected)/       # Protected routes (requires auth)
│   │   ├── admin/         # Admin dashboard (mobile view)
│   │   └── display/       # Customer TV display
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout with providers
├── components/            # Reusable components
│   ├── auth/             # Auth components
│   ├── admin/            # Admin UI components
│   └── display/          # Display UI components
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase client & utilities
│   └── utils/            # Helper functions
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

## Supabase Configuration

### Environment Variables Required
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Schema Implementation Order
1. Enable RLS on all tables
2. Create tables: stores → store_admins → order_calls → store_images → store_settings
3. Set up foreign key relationships
4. Create RLS policies for multi-tenant isolation
5. Set up Realtime subscriptions for order_calls table

### Supabase Client Setup
- Use `@supabase/ssr` for server-side client
- Implement separate clients for:
  - Server Components (cookies-based)
  - Client Components (browser-based)
  - API Routes (service role for admin operations)

## Critical Implementation Requirements

### 1. Authentication & Authorization
- Google OAuth integration via Supabase Auth
- Middleware to protect routes at `/app/middleware.ts`
- Check user role in store_admins table after authentication
- Redirect unauthenticated users to login

### 2. Real-time Features
- Use Supabase Realtime for order notifications
- Subscribe to `order_calls` table changes in display component
- Implement WebSocket reconnection logic with retry mechanism
- Enable Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;`
- Use unique channel names to avoid conflicts: `order-calls-${storeId}`
- Handle connection status with visual indicators
- Debug URL available at `/debug/realtime` for testing connections

### 3. Mobile Admin Interface
- Ten-key pad component with 1-999 number validation
- Toggle between takeout/dine-in modes
- Recent calls list with 5-minute default display
- Long-press gesture for deletion using touch events

### 4. TV Display Interface
- 60/40 split layout (carousel/notifications)
- Image carousel with 5-second intervals
- Voice notifications using Web Speech API
- Color coding: Blue for takeout, Red for dine-in

### 5. Performance Considerations
- Image optimization with Next.js Image component
- Implement proper loading states
- Use React Suspense for async components
- Cache Supabase queries where appropriate

## Development Workflow

### Setting Up Supabase Project
1. Create project at supabase.com
2. Enable Google Auth provider in Authentication settings
3. Create database tables using SQL editor
4. Set up Storage bucket for store images
5. Configure RLS policies

### Testing Authentication
1. Set up OAuth redirect URLs in Supabase
2. Add authorized domains in Google Cloud Console
3. Test login flow with development server

### Implementing Features (Priority Order)
1. **Phase 1**: Basic auth, admin interface, real-time notifications
2. **Phase 2**: Image upload, carousel, voice notifications  
3. **Phase 3**: Settings management, advanced features

## Common Patterns

### Protected API Route
```typescript
// app/api/protected/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check admin role
  const { data: admin } = await supabase
    .from('store_admins')
    .select('*')
    .eq('user_id', user.id)
    .single()
    
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Proceed with protected logic
}
```

### Real-time Subscription
```typescript
// components/display/OrderDisplay.tsx
useEffect(() => {
  const channel = supabase
    .channel('order-calls')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'order_calls' },
      (payload) => {
        // Handle new order notification
      }
    )
    .subscribe()
    
  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

## Important Notes

- Always use environment variables for sensitive data
- Implement proper error boundaries for production
- Use TypeScript strict mode for better type safety
- Follow Next.js 15 best practices with App Router
- Ensure mobile responsiveness for admin interface
- Test TV display on actual display resolution (1920x1080)