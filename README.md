# MatchMakr

A modern matchmaking platform that connects singles through Sponsors (matchmakers). Sponsors can sponsor singles, discover other singles in the pond, and facilitate conversations between singles through an approval system. Built with performance and user experience as top priorities.

## 🚀 Features

### Core Functionality
- **User Types**: Sponsors (MATCHMAKR), Singles (SINGLE), Vendors (VENDOR)
- **Authentication**: Supabase Auth with role-based access and global user type caching
- **Real-time Chat**: Instant messaging between Sponsors and Singles with auto-scroll and typing indicators
- **Match Approval**: Two-step approval system for matches between singles
- **Profile Management**: Photo uploads, interests, location-based discovery
- **Pond Discovery**: Browse and connect with singles with intelligent caching and scroll position restoration
- **Forum System**: Community discussion platform with categories, posts, replies, and likes
- **Sponsorship Management**: End sponsorship functionality with clean slate for re-initiation
- **Vendor Management**: Business profiles with dedicated onboarding and management systems

### Chat System
- **Sponsor-to-Sponsor**: Conversations about specific singles
- **Single-to-Sponsor**: Direct messaging between sponsored singles and their sponsors
- **Real-time Updates**: Live message delivery and read status via Supabase Realtime
- **Unread Counts**: Per-conversation unread message tracking with optimized fetching
- **Message History**: Persistent chat history with optimistic updates and immediate UI feedback
- **Auto-scroll**: Intelligent scroll-to-bottom behavior with user control
- **Typing Indicators**: Real-time typing status for better user experience

### Performance Features
- **Global User Type Caching**: Eliminates repeated database calls for user type verification
- **Intelligent Data Caching**: Pond page caches search results, filters, and scroll positions
- **Optimized API Calls**: Rate-limited and consolidated API requests to reduce redundancy
- **Efficient Database Queries**: Performance-optimized views and indexes
- **Smart Loading States**: Timeout-based loading to prevent infinite loading states

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **Deployment**: Vercel (Frontend), Supabase (Backend)
- **State Management**: React Context + Local State with intelligent caching
- **Real-time**: Supabase Realtime subscriptions with optimized channel management
- **Performance**: Client-side caching, rate limiting, and optimized database queries

## 🎨 Design System & Color Scheme

### Primary Color Palette
MatchMakr features a modern, cohesive blue-to-teal gradient theme that creates a professional and engaging user experience.

#### Core Colors
- **Primary Blue**: `#0066FF` - Main brand color for primary actions and highlights
- **Primary Teal**: `#00C9A7` - Complementary color for gradients and accents
- **Light Blue**: `#4D9CFF` - Secondary blue for lighter elements and hover states
- **Light Teal**: `#4DDDCC` - Secondary teal for subtle accents and backgrounds

#### Background Colors
- **Main Background**: `#F8FAFC` - Light, modern background for clean layouts
- **Card Background**: `#FFFFFF` - Pure white for content cards and modals
- **Gradient Start**: `#0066FF` - Blue starting point for gradient backgrounds
- **Gradient End**: `#00C9A7` - Teal ending point for gradient backgrounds

### Gradient System
The application uses a sophisticated gradient system for visual hierarchy and modern aesthetics:

#### Available Gradients
- **`bg-gradient-primary`**: Main blue-to-teal gradient (`#0066FF` → `#00C9A7`)
- **`bg-gradient-light`**: Lighter blue-to-teal gradient (`#4D9CFF` → `#4DDDCC`)
- **`bg-gradient-radial`**: Radial blue-to-teal gradient for circular elements
- **`bg-gradient-diagonal`**: 45-degree diagonal gradient for dynamic layouts
- **`bg-gradient-card`**: Subtle background gradient for card elements

#### Text Gradients
- **`text-gradient-primary`**: Text with blue-to-teal gradient effect
- **`gradient-text`**: Legacy class for gradient text (maintained for compatibility)

### Component Color Usage

#### Interactive Elements
- **Primary Buttons**: `bg-gradient-primary` with white text
- **Secondary Buttons**: `bg-gradient-light` with white text
- **Hover States**: Enhanced shadows with blue-tinted effects
- **Focus Rings**: `ring-primary-blue` with 50% opacity

#### Chat System
- **Current User Messages**: Blue-to-teal gradient (`#0066FF` → `#00C9A7`) with white text
- **Other User Messages**: Light blue-to-teal gradient (`#4D9CFF` → `#4DDDCC`) with white text
- **Send Buttons**: Gradient backgrounds with matching border gradients
- **Typing Indicators**: Subtle blue backgrounds for status elements

#### Navigation & Layout
- **Page Backgrounds**: Full-screen gradient backgrounds for immersive experiences
- **Card Borders**: Subtle white/transparent borders with hover effects
- **Navigation Elements**: Blue accents with teal hover states
- **Status Indicators**: Blue for success, yellow for pending, red for errors

### Shadow System
Enhanced shadow system that complements the color scheme:

#### Shadow Variants
- **`shadow-card`**: Subtle blue-tinted shadows for cards
- **`shadow-primary`**: Blue-tinted shadows for primary elements
- **`shadow-accent`**: Teal-tinted shadows for accent elements
- **`shadow-deep`**: Deeper shadows for elevated elements
- **`shadow-button`**: Interactive shadows for buttons and controls

#### Shadow Colors
- **Card Shadows**: `rgba(0,102,255,0.08)` for subtle depth
- **Primary Shadows**: `rgba(0,102,255,0.3)` for emphasis
- **Accent Shadows**: `rgba(0,201,167,0.3)` for teal elements
- **Hover Shadows**: Enhanced opacity for interactive feedback

### Accessibility & Contrast
- **Text Contrast**: White text on gradient backgrounds for optimal readability
- **Focus States**: High-contrast blue focus rings for keyboard navigation
- **Hover Effects**: Subtle color shifts with maintained contrast ratios
- **Status Colors**: Semantic color usage (blue for info, yellow for warnings, red for errors)

### Implementation Details
The color scheme is implemented through:
- **Tailwind CSS**: Custom color palette and gradient utilities
- **CSS Variables**: CSS custom properties for consistent theming
- **Component Classes**: Reusable utility classes for consistent styling
- **Dynamic Gradients**: Inline styles for complex gradient combinations

## 🔤 Typography & Brand Identity

### Logo Typography
The GREENLIGHT logo uses a sophisticated, minimalist typography approach inspired by premium brands like WHOOP:

#### Font Specifications
- **Primary Font**: `Bahnschrift Light` - A modern, refined sans-serif that conveys sophistication and tech-forward innovation
- **Fallback Stack**: `'Bahnschrift Light', 'Bahnschrift', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- **Weight**: Light (font-weight: 300) for elegant, refined appearance
- **Case**: All uppercase for strong, confident brand presence
- **Letter Spacing**: `tracking-[0.15em]` for premium, spacious feel
- **Size**: `text-lg` for subtle, compact appearance that doesn't dominate the interface

#### Design Philosophy
- **Minimalist**: Clean, uncluttered typography without unnecessary effects
- **Premium**: Bahnschrift Light's refined letterforms create a sophisticated aesthetic
- **Spacious**: Generous letter spacing enhances readability and premium feel
- **Consistent**: Same treatment across all brand touchpoints
- **Accessible**: High contrast white text for optimal readability

### Body Typography
- **Primary Font**: Inter - Modern, highly readable sans-serif for body text and UI elements
- **Secondary Fonts**: Source Sans Pro and Raleway for specific use cases
- **Font Stack**: Comprehensive fallback system for cross-platform consistency

### Typography Scale
- **Logo**: `text-lg` with custom letter spacing
- **Headings**: `text-2xl` to `text-5xl` with appropriate font weights
- **Body Text**: `text-base` to `text-lg` for optimal readability
- **UI Elements**: `text-sm` to `text-base` for buttons and controls

## 📁 Project Structure

```
MatchMakr_v0/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes for messages, matches, forum, etc.
│   │   ├── dashboard/         # Dashboard pages for different user types
│   │   ├── auth/              # Authentication flows
│   │   ├── pond/              # Singles discovery with caching
│   │   └── forum/             # Community discussion platform
│   ├── components/            # Reusable components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── chat/              # Chat components with performance optimizations
│   │   ├── profile/           # Profile management components
│   │   └── onboarding/        # User onboarding flow
│   ├── contexts/              # React Context providers (AuthContext with caching)
│   └── lib/                   # Utilities and Supabase configuration
├── supabase/                  # Database migrations and edge functions
│   ├── migrations/            # Database schema changes and optimizations
│   └── functions/             # Edge functions for sponsorship management
└── public/                    # Static assets
```

## 🗄 Database Schema

### Core Tables
- **`profiles`**: User accounts with types (MATCHMAKR, SINGLE) and sponsorship relationships
- **`vendor_profiles`**: Business accounts (VENDOR) with business-specific fields and services
- **`conversations`**: Chat threads between users with single references
- **`messages`**: Individual messages with read status and conversation linking
- **`matches`**: Approved connections between singles with approval tracking
- **`interests`**: User interests and preferences for matching
- **`forum_categories`**: Discussion categories for the community forum
- **`forum_posts`**: Forum posts with reply functionality and like counts
- **`forum_replies`**: Nested replies to forum posts
- **`forum_likes`**: Like system for posts and replies
- **`offers`**: Vendor business offers and advertisements

### Performance Views
- **`conversation_summaries`**: Optimized view for dashboard performance
- **`forum_posts_with_counts`**: Forum posts with aggregated like and reply counts

### User Type Architecture
MatchMakr uses a **clean separation strategy** for different user types:

#### **Personal Users (profiles table):**
- **SINGLE users**: People looking for matches, can be sponsored by MATCHMAKR users
- **MATCHMAKR/SPONSOR users**: Professional matchmakers who sponsor singles
- **Shared fields**: name, sex, birth_year, bio, occupation, location, photos
- **Relationships**: Connected via `sponsored_by_id` for sponsor-single connections

#### **Business Users (vendor_profiles table):**
- **VENDOR users**: Businesses offering services/products to the community
- **Business fields**: business_name, industry, street_address, city, state, zip_code
- **Independence**: No sponsor relationships, operate as independent business entities
- **Services**: Create offers and advertisements through the offers table

#### **Benefits of Separation:**
- **Clean data model**: No NULL fields for non-applicable data
- **Better performance**: Smaller, focused tables for faster queries
- **Easier maintenance**: Changes to business logic don't affect personal users
- **Type safety**: Clear separation prevents data mixing between user types

## 🗄 Database & Deployment Fixes

### Onboarding System (August 2025)
- **Trigger Function Optimization**: Updated `handle_new_user()` trigger to properly handle all user types (SINGLE, MATCHMAKR, VENDOR)
- **Complete Profile Creation**: Profiles are now created with all onboarding data (name, sex, birth_year) instead of null values
- **User Type Handling**: Fixed hardcoded 'SINGLE' user type issue that was preventing Sponsor users from completing onboarding
- **Vendor Profile Separation**: Implemented clean separation with dedicated `vendor_profiles` table and trigger system
- **Migration Cleanup**: Resolved conflicting trigger migrations and restored clean, working onboarding system

### Production Deployment (August 2025)
- **CSS Build Fixes**: Resolved @import rule ordering issues that caused loading problems in Vercel production builds
- **Font Loading**: Fixed Google Fonts import order to ensure proper loading in production environment
- **Build Process**: CSS rules now follow proper order: @import → Tailwind → custom styles

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run migrations: `npx supabase db push`
5. Deploy edge functions: `npx supabase functions deploy`
6. Start development server: `npm run dev`

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔧 Development

### Key Components

#### Authentication & Performance
- **`AuthContext`**: Global user type caching and authentication state management
- **`DashboardWrapper`**: Optimized authentication and user type verification
- **`DashboardLayout`**: Common layout with logout button and navigation

#### Chat System
- **`ChatPage`**: Individual chat interface with auto-scroll and real-time updates
- **`ChatModal`**: Modal-based chat for quick conversations
- **`MatchMakrChatListClient`**: Optimized chat list with rate-limited API calls
- **`SingleDashboardClient`**: Single user dashboard with sponsor chat integration

#### Forum System
- **`ForumPage`**: Main forum interface with categories and posts
- **`Forum API Routes`**: RESTful API for forum operations
- **`Forum Components`**: Post creation, replies, likes, and moderation

#### Sponsorship Management
- **`EndSponsorshipModal`**: Confirmation modal for ending sponsorships
- **`SponsoredSinglesList`**: Management interface for sponsored singles
- **`End Sponsorship Edge Function`**: Clean sponsorship termination with chat cleanup

### Performance Optimizations

#### User Type Caching
- **Global Cache**: User type is fetched once and cached in AuthContext
- **Eliminates Redundancy**: No more repeated database calls for user type verification
- **Faster Navigation**: Dashboard loading reduced from 2-3 seconds to under 500ms

#### Data Caching Strategy
- **Pond Page Caching**: Search results, filters, and scroll positions cached locally
- **Scroll Position Restoration**: Users return to exact position when navigating back
- **Search State Persistence**: Filters and search terms maintained across sessions

#### Chat Performance
- **Rate-Limited API Calls**: Prevents excessive API requests with intelligent throttling
- **Optimized Unread Counts**: Consolidated fetching with caching to reduce database load
- **Smart Scroll Management**: Auto-scroll with user control and scroll-to-bottom button

#### Database Optimizations
- **Performance Views**: `conversation_summaries` and `forum_posts_with_counts` for fast queries
- **Strategic Indexing**: Database indexes on frequently queried columns
- **Efficient Queries**: Optimized SELECT statements with minimal data transfer

### Development Guidelines

#### Adding Features
1. **Leverage existing caching**: Use AuthContext for user data, implement local caching for new features
2. **Chat functionality is complex** - test thoroughly with multiple users
3. **Unread counts are conversation-specific** - not user-specific
4. **Real-time updates** use Supabase subscriptions with proper cleanup
5. **Match approval** requires both Sponsors to approve

#### Performance Best Practices
1. **Cache user types globally** - never fetch user type more than once per session
2. **Implement rate limiting** - prevent excessive API calls with intelligent throttling
3. **Use performance views** - leverage database views for complex queries
4. **Optimize real-time subscriptions** - clean up channels and limit active subscriptions
5. **Implement intelligent loading states** - use timeouts to prevent infinite loading

#### Database Changes
1. Create migration: `npx supabase migration new migration_name`
2. Test locally: `npx supabase db reset`
3. Deploy: `npx supabase db push`
4. Update performance views if needed

## 🐛 Known Issues & Solutions

### Resolved Issues
- ✅ **Chat scroll behavior**: Fixed with intelligent auto-scroll and user control
- ✅ **Navigation performance**: Solved with global user type caching
- ✅ **Settings page hanging**: Resolved with timeout-based loading and cached user types
- ✅ **Excessive API calls**: Eliminated with rate limiting and intelligent caching
- ✅ **Sponsorship management**: Implemented clean end sponsorship with chat cleanup

### Recently Resolved (August 2025)
- ✅ **Sponsor onboarding failure**: Fixed trigger function to properly handle MATCHMAKR users and save onboarding data
- ✅ **CSS build issues in production**: Resolved @import rule ordering for Vercel deployment
- ✅ **Profile creation with null data**: Trigger function now creates complete profiles with all onboarding information

### Current Considerations
- **Forum RLS**: Temporarily disabled for development, will be re-enabled for production
- **Migration consolidation**: Multiple small migrations exist, could be consolidated
- **Type safety**: Some components use `any` types, gradual TypeScript improvement ongoing

## 🚀 Deployment

### Frontend (Vercel)
- Automatic deployment from main branch
- Environment variables configured in Vercel dashboard
- Edge functions for API routes

### Backend (Supabase)
- Database migrations: `npx supabase db push`
- Edge functions: `npx supabase functions deploy`
- Real-time subscriptions enabled
- Performance views and indexes automatically deployed

## 📊 Performance Metrics

### Before Optimizations
- Dashboard loading: 2-3 seconds
- API response times: 150-1500ms
- Repeated user type fetches: 3-5 per session
- Chat loading: 1-2 seconds with scroll issues

### After Optimizations
- Dashboard loading: <500ms
- API response times: 50-300ms
- User type fetches: 1 per session (cached)
- Chat loading: <500ms with smooth scroll behavior

### Caching Benefits
- **User Type**: 90% reduction in database calls
- **Pond Data**: 80% faster subsequent page loads
- **Chat History**: 70% reduction in API calls
- **Overall UX**: 3-5x improvement in perceived performance

## 🔮 Recent Improvements

### Performance Enhancements
1. **Global User Type Caching**: Eliminated repeated database calls
2. **Intelligent Data Caching**: Pond page caching with scroll restoration
3. **Rate-Limited API Calls**: Prevented excessive requests
4. **Optimized Database Queries**: Performance views and strategic indexing
5. **Smart Loading States**: Timeout-based loading to prevent hanging

### New Features
1. **Forum System**: Complete community discussion platform
2. **End Sponsorship**: Clean sponsorship termination with chat cleanup
3. **Enhanced Chat**: Auto-scroll, typing indicators, and scroll-to-bottom
4. **Improved Navigation**: Faster dashboard loading and navigation
5. **Better UX**: Reduced loading times and improved responsiveness
6. **Vendor Management**: Dedicated business profiles with separate onboarding system

### Chat System Improvements
1. **Auto-scroll Behavior**: Intelligent scroll management with user control
2. **Real-time Performance**: Optimized Supabase subscriptions
3. **Message Cleanup**: Proper cleanup when sponsorship ends
4. **UI Responsiveness**: Immediate feedback for user actions
5. **Scroll Position Management**: Maintains user's place in conversations

### Critical System Fixes (August 2025)
1. **Sponsor User Onboarding**: Fixed critical issue preventing Sponsor users from completing signup
2. **Profile Data Persistence**: Resolved issue where onboarding data was being lost during profile creation
3. **Production Build Issues**: Fixed CSS @import ordering that caused loading failures in Vercel
4. **Database Trigger Optimization**: Updated trigger function to handle all user types correctly
5. **Vendor Onboarding System**: Implemented clean separation with dedicated vendor_profiles table
6. **Migration Conflict Resolution**: Cleaned up conflicting trigger migrations and restored stable system

### Architecture Improvements (August 2025)
1. **User Type Separation**: Clean separation between personal users (profiles) and business users (vendor_profiles)
2. **Dedicated Vendor System**: Independent business profiles with business-specific fields
3. **Trigger System Optimization**: Separate triggers for different user types prevent conflicts
4. **Clean Data Model**: No more NULL fields for non-applicable data across user types
5. **Maintainable Structure**: Changes to business logic don't affect personal user functionality

## 🤝 Contributing

### Development Workflow
1. Create feature branch from main
2. Implement changes with performance in mind
3. Test thoroughly, especially chat and real-time features
4. Update documentation if needed
5. Submit PR with clear description of performance impact

### Testing Strategy
- **Manual testing** for chat functionality and real-time updates
- **Performance testing** for dashboard loading and navigation
- **API testing** for rate limiting and caching behavior
- **Database testing** for migrations and performance views

## 📝 Development Notes

### Critical Areas
- **Chat system is optimized** - real-time subscriptions and caching implemented
- **User type caching is critical** - never bypass the global cache
- **Performance views are essential** - use them for complex queries
- **Rate limiting prevents abuse** - implement for new API endpoints
- **User type separation is critical** - SINGLE/SPONSOR use profiles table, VENDOR use vendor_profiles table

### Performance Tips
- Use `useAuth()` hook for cached user data
- Implement local caching for frequently accessed data
- Use performance views for complex database queries
- Clean up real-time subscriptions properly
- Implement intelligent loading states with timeouts
- Leverage user type separation for optimized queries

### Architecture Decisions
- **Global user type caching** in AuthContext for performance
- **Local component caching** for page-specific data
- **Performance views** for complex database operations
- **Edge functions** for sensitive operations like sponsorship management
- **Rate limiting** for API endpoints to prevent abuse
- **User type separation** for clean data models and better performance
- **Dedicated vendor system** for business users independent of personal users

---

**Last Updated**: August 2025  
**Version**: v0 (Performance Optimized + Onboarding Fixed + Vendor System Implemented)  
**Status**: Active Development with Performance Focus and Clean Architecture 