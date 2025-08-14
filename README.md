# The e5000 - Professional Landscaping Sales App

A comprehensive iPad-optimized application for landscaping sales representatives to create estimates, generate AI mockups, and close deals on-site.

## Features

✅ **Complete Sales Workflow**
- Client information management with real-time updates
- Photo capture with mobile camera integration
- AI-powered landscaping mockups using OpenAI DALL-E 3
- Dynamic pricing system with Google Sheets integration
- PDF contract generation with digital signatures
- Automated email notifications for clients and team

✅ **Technologies Used**
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **AI Integration**: OpenAI DALL-E 3 for mockup generation
- **PDF Generation**: jsPDF for contracts
- **Email**: Resend for notifications
- **UI Components**: shadcn/ui with Radix UI primitives

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key

# OpenAI (Required for AI mockups)
OPENAI_API_KEY=your_openai_api_key

# Resend (Required for email notifications)
RESEND_API_KEY=your_resend_api_key

# Google Sheets (Optional - fallback to default pricing)
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
# ... other Google credentials
```

### 2. Database Setup

The app requires these Supabase tables:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID REFERENCES profiles(id) NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  original_image_url TEXT,
  final_mockup_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mockups table
CREATE TABLE mockups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  ai_provider TEXT,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimates table
CREATE TABLE estimates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) NOT NULL,
  items JSONB,
  subtotal DECIMAL,
  low_estimate DECIMAL,
  high_estimate DECIMAL,
  final_amount DECIMAL,
  contract_pdf_url TEXT,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing items table
CREATE TABLE pricing_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  low_price DECIMAL,
  high_price DECIMAL,
  unit TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Storage Buckets

Create these Supabase Storage buckets:
- `session-photos` (for property photos and mockups)
- `contracts` (for PDF contracts)

### 4. Installation & Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Workflow Overview

1. **Authentication**: Sales reps log in with Supabase Auth
2. **Dashboard**: View and manage client sessions
3. **Client Info**: Capture client details and project requirements
4. **Photo Upload**: Take/upload property photos with mobile camera
5. **AI Mockup**: Generate landscaping designs using OpenAI
6. **Estimate**: Build pricing with dynamic item catalog
7. **Contract**: Generate PDF and capture digital signatures
8. **Complete**: Send notifications and mark session complete

## Key Components

- `PhotoCapture.tsx`: Mobile-optimized camera and file upload
- `ClientInfoForm.tsx`: Real-time client data management
- `MockupGenerator.tsx`: AI mockup generation with OpenAI
- `EstimateBuilder.tsx`: Dynamic pricing with Google Sheets integration
- `ContractGenerator.tsx`: PDF generation and signature capture
- `SignatureCapture.tsx`: Touch-optimized digital signatures

## API Routes

- `/api/generate-mockup`: OpenAI DALL-E 3 integration
- `/api/pricing`: Google Sheets pricing integration
- `/api/generate-contract`: PDF generation with jsPDF
- `/api/send-email`: Resend email notifications

## Mobile Optimization

The app is specifically designed for iPad use with:
- Touch-friendly interfaces
- Camera integration for property photos
- Signature capture for contracts
- Responsive design for various screen sizes

## Deployment

Deploy to Vercel with environment variables configured:

```bash
vercel --prod
```

Ensure all API keys and Supabase credentials are set in Vercel's environment variables.

---

Built with ❤️ for professional landscaping sales teams.
