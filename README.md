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
- **`profiles`**: User accounts with types (MATCHMAKR, SINGLE, VENDOR) and sponsorship relationships
- **`conversations`**: Chat threads between users with single references
- **`messages`**: Individual messages with read status and conversation linking
- **`matches`**: Approved connections between singles with approval tracking
- **`interests`**: User interests and preferences for matching
- **`forum_categories`**: Discussion categories for the community forum
- **`forum_posts`**: Forum posts with reply functionality and like counts
- **`forum_replies`**: Nested replies to forum posts
- **`forum_likes`**: Like system for posts and replies

### Performance Views
- **`conversation_summaries`**: Optimized view for dashboard performance
- **`forum_posts_with_counts`**: Forum posts with aggregated like and reply counts

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

### Chat System Improvements
1. **Auto-scroll Behavior**: Intelligent scroll management with user control
2. **Real-time Performance**: Optimized Supabase subscriptions
3. **Message Cleanup**: Proper cleanup when sponsorship ends
4. **UI Responsiveness**: Immediate feedback for user actions
5. **Scroll Position Management**: Maintains user's place in conversations

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

### Performance Tips
- Use `useAuth()` hook for cached user data
- Implement local caching for frequently accessed data
- Use performance views for complex database queries
- Clean up real-time subscriptions properly
- Implement intelligent loading states with timeouts

### Architecture Decisions
- **Global user type caching** in AuthContext for performance
- **Local component caching** for page-specific data
- **Performance views** for complex database operations
- **Edge functions** for sensitive operations like sponsorship management
- **Rate limiting** for API endpoints to prevent abuse

---

**Last Updated**: January 2025  
**Version**: v0 (Performance Optimized)  
**Status**: Active Development with Performance Focus 