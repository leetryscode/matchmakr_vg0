# GreenLight

A matchmaking platform that connects singles through Sponsors (matchmakers). Sponsors can sponsor singles, discover other singles in the pond, and facilitate conversations between singles through an approval system.

## 🚀 Features

### Core Functionality
- **User Types**: Sponsors, Singles, Vendors
- **Authentication**: Supabase Auth with role-based access
- **Real-time Chat**: Instant messaging between Sponsors and Singles
- **Match Approval**: Two-step approval system for matches
- **Profile Management**: Photo uploads, interests, location-based discovery
- **Pond Discovery**: Browse and connect with singles

### Chat System
- **Sponsor-to-Sponsor**: Conversations about specific singles
- **Single-to-Single**: Direct messaging between matched singles
- **Real-time Updates**: Live message delivery and read status
- **Unread Counts**: Per-conversation unread message tracking
- **Message History**: Persistent chat history with optimistic updates

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel (Frontend), Supabase (Backend)
- **State Management**: React Context + Local State
- **Real-time**: Supabase Realtime subscriptions

## 📁 Project Structure

```
GreenLight_v0/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── auth/              # Authentication
│   │   └── pond/              # Singles discovery
│   ├── components/            # Reusable components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── chat/              # Chat components
│   │   └── profile/           # Profile components
│   ├── contexts/              # React Context providers
│   └── lib/                   # Utilities and config
├── supabase/                  # Database migrations and functions
│   ├── migrations/            # Database schema changes
│   └── functions/             # Edge functions
└── public/                    # Static assets
```

## 🗄 Database Schema

### Core Tables
- **`profiles`**: User accounts with types (SPONSOR, SINGLE, VENDOR)
- **`conversations`**: Chat threads between users
- **`messages`**: Individual messages with read status
- **`matches`**: Approved connections between singles
- **`interests`**: User interests and preferences

### Views
- **`conversation_summaries`**: Optimized view for dashboard performance

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
5. Start development server: `npm run dev`

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔧 Development

### Key Components

#### Dashboard System
- **`DashboardWrapper`**: Authentication and user type verification
- **`DashboardLayout`**: Common layout with navigation
- **`SponsorChatList`**: Chat list for Sponsors
- **`SingleDashboardClient`**: Dashboard for Singles

#### Chat System
- **`ChatPage`**: Individual chat interface
- **`ChatModal`**: Modal-based chat (legacy)
- **`SponsorChatListClient`**: Complex chat list logic

#### API Routes
- **`/api/conversations`**: Fetch chat conversations
- **`/api/messages`**: Send/receive messages
- **`/api/matches`**: Match approval system
- **`/api/profiles/pond`**: Singles discovery

### Development Guidelines

#### Adding Features
1. **Chat functionality is complex** - test thoroughly
2. **Unread counts are conversation-specific** - not user-specific
3. **Real-time updates** use Supabase subscriptions
4. **Match approval** requires both Sponsors to approve

#### Database Changes
1. Create migration: `npx supabase migration new migration_name`
2. Test locally: `npx supabase db reset`
3. Deploy: `npx supabase db push`

#### Performance Considerations
- Use `conversation_summaries` view for dashboard
- Implement proper caching for unread counts
- Optimize API calls to reduce redundancy

## 🐛 Known Issues

### High Priority
- **Chat pages don't start at bottom consistently**
- **Excessive API calls** - conversations endpoint called repeatedly
- **Performance issues** with repeated unread count fetches

### Medium Priority
- **Migration files need consolidation** - multiple small migrations
- **Excessive logging** throughout codebase
- **Type safety** - many `any` types used

### Low Priority
- **Component complexity** - some components doing too much
- **Error handling** - inconsistent patterns
- **Code duplication** - similar logic in multiple places

## 🧹 Technical Debt

### Code Quality
- **`SponsorChatListClient`**: 553 lines, doing too much
- **Excessive console.log statements** throughout
- **Inconsistent error handling** patterns
- **Mixed use of `any` types** instead of proper TypeScript

### Performance Issues
- **Repeated API calls** to `/api/conversations`
- **No caching** for unread counts
- **Inefficient database queries** in some areas
- **Real-time subscription management** could be optimized

### Database
- **Migration consolidation needed** - 15+ migration files
- **Some indexes missing** for performance
- **View optimization** could be improved

### Architecture
- **Component responsibilities** not clearly defined
- **State management** scattered across components
- **API endpoint organization** could be better
- **Error boundaries** missing in some areas

## 🚀 Deployment

### Frontend (Vercel)
- Automatic deployment from main branch
- Environment variables configured in Vercel dashboard
- Edge functions for API routes

### Backend (Supabase)
- Database migrations: `npx supabase db push`
- Edge functions: `npx supabase functions deploy`
- Real-time subscriptions enabled

## 📊 Monitoring

### Performance Metrics
- API response times (currently 150-1500ms)
- Real-time message delivery
- Unread count accuracy
- Database query performance

### Error Tracking
- Supabase error logs
- Vercel function logs
- Client-side error boundaries (needed)

## 🔮 Future Improvements

### Short Term
1. Fix chat bottom scrolling issue
2. Consolidate migration files
3. Remove excessive logging
4. Implement proper error boundaries

### Medium Term
1. Optimize API calls and implement caching
2. Improve TypeScript type safety
3. Refactor complex components
4. Add comprehensive testing

### Long Term
1. Implement proper state management (Zustand/Redux)
2. Add comprehensive error tracking
3. Performance monitoring and optimization
4. Mobile app development

## 🤝 Contributing

### Development Workflow
1. Create feature branch from main
2. Make changes with minimal impact on existing functionality
3. Test thoroughly, especially chat features
4. Update documentation if needed
5. Submit PR with clear description

### Testing Strategy
- **Manual testing** for chat functionality
- **API testing** for endpoints
- **Database testing** for migrations
- **Performance testing** for critical paths

## 📝 Notes

### Critical Areas
- **Chat system is fragile** - changes require careful testing
- **Real-time subscriptions** need proper cleanup
- **Unread count logic** is complex and critical
- **Match approval flow** involves multiple user types

### Development Tips
- Use Supabase dashboard for database inspection
- Monitor real-time subscriptions in browser dev tools
- Test chat functionality with multiple users
- Check migration files before deploying

---

**Last Updated**: December 2024  
**Version**: v0 (Development)  
**Status**: Active Development 