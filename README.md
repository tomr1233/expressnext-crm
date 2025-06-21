# AI Agency CRM

[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

A modern, comprehensive Customer Relationship Management (CRM) system specifically designed for AI automation agencies. Built with Next.js 15, React 19, TypeScript, and Supabase, this application provides a complete sales pipeline management solution from lead prospecting to client onboarding.

## ✨ Features

### 🎯 Lead Management & Prospecting
- **Smart Lead Filtering**: Filter leads by bio keywords, follower count, website presence
- **Bio Match Scoring**: AI-powered bio matching with percentage scores
- **Multi-Source Tracking**: Track leads from LinkedIn, Twitter, cold email campaigns
- **Lead Qualification**: Mark leads as qualified/unqualified with status tracking
- **Tag Management**: Organize leads with custom tags (AI, SaaS, Marketing, etc.)

### 📊 Sales Pipeline Management
- **Kanban Board**: Visual pipeline with drag-and-drop deal management
- **Deal Stages**: Contacted → Demo Scheduled → Negotiating → Proposal Sent
- **Deal Tracking**: Monitor deal values, owners, and due dates
- **Activity Logging**: Track all interactions and deal progression

### 💰 Closed Deals Analytics
- **Deal Performance**: Track won deals with comprehensive metrics
- **Revenue Analytics**: Monitor deal values, close dates, and performance trends
- **Client Management**: Detailed client information and deal history
- **Export Functionality**: CSV export for reporting and analysis

### 🚀 Client Onboarding
- **Post-Sale Handoff**: Seamless transition from sales to operations
- **Progress Tracking**: Visual progress bars and completion percentages
- **Step Management**: Customizable onboarding checklists
- **Team Assignment**: Assign onboarding specialists to clients
- **Status Monitoring**: Track onboarding status (in-progress, completed, delayed)

### 📚 Resource Management
- **Knowledge Base**: Internal resource library for team collaboration
- **File Management**: Upload and organize documents, videos, images
- **Categorization**: Organize by department (Sales, Marketing, Operations)
- **Tag System**: Advanced tagging for easy resource discovery
- **Search Functionality**: Quick resource search and filtering

### 📈 Dashboard & Analytics
- **KPI Overview**: Total leads, active deals, monthly revenue, closed deals
- **Recent Activity**: Real-time activity feed with team member actions
- **Pipeline Overview**: Visual representation of deal stages and values
- **Performance Metrics**: Track team and individual performance

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, shadcn/ui components |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **UI Components** | Radix UI primitives, Lucide React icons |
| **Date Handling** | date-fns |
| **Drag & Drop** | react-dnd |
| **Development** | ESLint, TypeScript strict mode |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-agency-crm.git
   cd ai-agency-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   - Use the Supabase dashboard to create the necessary tables
   - Or run the provided SQL migrations (if available)

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📂 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── deals/             # Closed deals page
│   ├── leads/             # Lead management page
│   ├── onboarding/        # Client onboarding page
│   ├── pipeline/          # Active pipeline page
│   ├── resources/         # Resource library page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Dashboard home page
├── components/            # Reusable React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── deals/             # Deal management components
│   ├── layout/            # Layout components (sidebar, header)
│   ├── leads/             # Lead management components
│   ├── onboarding/        # Onboarding components
│   ├── pipeline/          # Pipeline components
│   ├── resources/         # Resource management components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utility functions and configurations
│   ├── supabase.ts        # Supabase client and types
│   └── utils.ts           # Utility functions
└── types/                 # TypeScript type definitions
```

## 🎨 Design System

The application uses a consistent design system built on:

- **Color Palette**: Neutral grays with blue accents for primary actions
- **Typography**: Geist Sans and Geist Mono fonts
- **Spacing**: 8px grid system for consistent spacing
- **Components**: shadcn/ui for consistent, accessible components
- **Icons**: Lucide React for a cohesive icon set

## 🔐 Authentication & Security

- **Supabase Auth**: Secure authentication with email/password
- **Row Level Security**: Database-level security policies
- **Type Safety**: Full TypeScript coverage for type safety
- **Environment Variables**: Secure configuration management

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured experience with sidebar navigation
- **Tablet**: Collapsible sidebar with touch-friendly interactions
- **Mobile**: Mobile-optimized layouts and navigation

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Write TypeScript with strict type checking
- Use the established component patterns
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Lucide](https://lucide.dev/) for the icon set

## 📞 Support

If you have any questions or need help with setup, please:
- Open an issue on GitHub
- Check the documentation
- Contact the development team

---

**Built with ❤️ for AI automation agencies**