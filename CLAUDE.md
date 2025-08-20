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

# AWS Cognito Authentication
NEXT_PUBLIC_AWS_REGION=your_aws_region
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_cognito_user_pool_id
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=your_cognito_client_id
NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=your_cognito_identity_pool_id
# Only add this if your app client has a secret (not recommended for web apps)
COGNITO_CLIENT_SECRET=your_client_secret_if_exists

# Google Analytics Data API
GOOGLE_ANALYTICS_PROPERTY_ID=your_ga4_property_id
GOOGLE_ANALYTICS_PROJECT_ID=your_gcp_project_id
GOOGLE_ANALYTICS_CLIENT_EMAIL=your_service_account_email
GOOGLE_ANALYTICS_PRIVATE_KEY=your_service_account_private_key
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

#### Google Analytics Integration (src/lib/google-analytics.ts)
- GA4 Data API integration with service account authentication
- Real-time and historical analytics data
- Metrics: active users, sessions, page views, bounce rate, session duration
- Top pages and traffic sources analysis
- API routes: `/api/analytics/overview`, `/api/analytics/top-pages`, `/api/analytics/traffic-sources`, `/api/analytics/realtime`

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
- TypeScript build errors are checked (`ignoreBuildErrors: false`)
- Next.js 15 with App Router
- Image optimization enabled for S3 and external domains
- Security headers configured for production

### Development Notes
- Uses `@/` path alias for src/ directory
- Strict TypeScript is disabled (`strict: false`)
- All integrations require proper environment variable setup
- Google Drive requires OAuth consent screen configuration

## TypeScript Best Practices

### Avoiding Type Declaration Conflicts

**NEVER** create custom `.d.ts` files for well-maintained packages like AWS SDK, as they override official types and cause import errors.

#### Debugging TypeScript Import Issues
```bash
# Check what TypeScript is resolving
npx tsc --traceResolution --noEmit | grep "package-name"

# Show full TypeScript config
npx tsc --showConfig

# Find all custom type declarations
find src -name "*.d.ts" -type f
```

#### Proper Type Extension Patterns
```typescript
// ✅ Good: Extend existing types
import type { S3Client } from "@aws-sdk/client-s3";
type ExtendedS3Client = S3Client & { customProperty?: string };

// ✅ Good: Create intersection types  
type ResourceWithUrl = Resource & { download_url?: string };

// ❌ Bad: Override entire module
declare module '@aws-sdk/client-s3' {
  export class S3Client { ... }
}
```

#### Type Declaration File Guidelines
- **Avoid** for packages that include their own TypeScript definitions
- **Check** package health: `npm ls @types/package-name`
- **Document** why custom declarations are needed if absolutely necessary
- **Remove** when upgrading to versions with built-in types

#### Recommended TSConfig Settings
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "strict": false
  }
}
```

**Rule**: Trust official package types first, debug module resolution second, create custom declarations as last resort.