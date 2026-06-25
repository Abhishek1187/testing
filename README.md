# LeadManager — AI-Powered Lead Intelligence

A full-stack lead management system built with **Next.js 16**, **Supabase**, **Resend**, and **OpenAI**. Captures leads via a form, sends tracked emails, and displays real-time analytics.

![LeadManager Dashboard](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase) ![Resend](https://img.shields.io/badge/Resend-Email-blue) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5-412991?logo=openai)

## Features

- 📋 **Lead Capture Form** — collects name, email, phone, company, and requirement
- 🤖 **AI Categorization** — GPT-3.5 auto-classifies each lead's category and priority (High/Medium/Low)
- 📧 **Email Tracking** — invisible pixel tracks email opens; link clicks are intercepted and logged
- 📊 **Analytics Dashboard** — live stats: total leads, emails sent/opened/clicked, open rate, click rate
- 🔄 **Auto-refresh** — dashboard polls for updates every 15 seconds

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (PostgreSQL) |
| Email | Resend |
| AI | OpenAI GPT-3.5-turbo |
| Styling | Vanilla CSS (dark mode design system) |
| Icons | Lucide React |

## Architecture

```
lead-manager/
├── app/
│   ├── page.tsx               # Dashboard + Lead Form UI
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Design system (dark mode)
│   └── api/
│       ├── submit/route.ts    # POST: save lead, AI classify, send email
│       └── track/
│           ├── open/route.ts  # GET: 1×1 pixel → marks email_opened=true
│           └── click/route.ts # GET: redirect → marks link_clicked=true
```

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/lead-manager.git
cd lead-manager
npm install
```

### 2. Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Database Schema
Run in **Supabase SQL Editor**:
```sql
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  requirement TEXT,
  category TEXT,
  priority TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_opened BOOLEAN DEFAULT FALSE,
  link_clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/lead-manager)

Set all environment variables in Vercel dashboard, and update `NEXT_PUBLIC_BASE_URL` to your production URL.

## How Email Tracking Works

1. **Open Tracking** — A 1×1 transparent GIF is embedded in every email. When the mail client loads it, it hits `/api/track/open?id=<leadId>`, which updates `email_opened=true` in the database.

2. **Click Tracking** — Links in emails point to `/api/track/click?id=<leadId>&redirect=<url>`, which updates `link_clicked=true` and redirects the user to the target URL.

## License

MIT
