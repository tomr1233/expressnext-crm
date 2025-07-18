# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production (ignores TypeScript errors)
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Environment Variables Required

Create `.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Drive Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# AWS S3 Integration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name
```

## Project Architecture

### Core Data Models (src/lib/supabase.ts)
- **Lead**: Prospecting data with bio matching, follower counts, qualification status
- **Deal**: Active pipeline deals with stages (contacted → demo → negotiating → proposal)
- **ClosedDeal**: Completed deals with revenue tracking
- **OnboardingClient**: Post-sale client onboarding with progress tracking
- **Resource**: File management with S3 integration and categorization

### Page Structure & Navigation
The app uses a fixed sidebar navigation with these main sections:
- **Dashboard** (`/`): KPI overview and recent activity
- **Prospecting & Leads** (`/leads`): Lead management and qualification
- **Active Pipeline** (`/pipeline`): Kanban board for deal stages
- **Closed Deals** (`/deals`): Revenue analytics and deal history
- **Onboarding** (`/onboarding`): Client onboarding workflows
- **Resources** (`/resources`): File management with Google Drive sync

### Integration Architecture

#### Google Drive Integration (src/lib/google-drive.ts)
- OAuth2 flow with offline access for persistent tokens
- Scopes: `drive.readonly` and `drive.metadata.readonly`
- File sync capabilities with automatic categorization
- API routes: `/api/google/auth`, `/api/google/callback`, `/api/google/sync`

#### AWS S3 Integration (src/lib/s3.ts)
- Direct upload via pre-signed URLs
- File storage with metadata tracking in Supabase
- Integrated with resource management system

#### Supabase Integration (src/lib/supabase.ts)
- Primary database for all CRM data
- TypeScript interfaces for all data models
- Client-side queries for real-time updates

### Component Organization
- **Layout components**: Sidebar with collapsible navigation, header with theme toggle
- **Page-specific components**: Organized by feature (deals/, leads/, pipeline/, etc.)
- **UI components**: shadcn/ui components in `components/ui/`
- **Shared components**: Dashboard stats, activity feeds, data tables

### API Routes Structure
- **Google Drive**: `/api/google/` - OAuth, file listing, sync operations
- **Resources**: `/api/resources/` - File upload, metadata management
- **Multiple sync endpoints**: Standard sync, enhanced sync, webhook handling

### Theme & Styling
- Uses Tailwind CSS 4 with custom CSS variables
- Light/dark theme support with system preference detection
- Geist Sans and Geist Mono fonts
- Custom sidebar color scheme with CSS variables

### Build Configuration
- TypeScript build errors are ignored (`ignoreBuildErrors: true`)
- Next.js 15 with App Router
- Image optimization enabled for S3 and external domains
- Security headers configured for production

### Development Notes
- Uses `@/` path alias for src/ directory
- Strict TypeScript is disabled (`strict: false`)
- All integrations require proper environment variable setup
- Google Drive requires OAuth consent screen configuration