# RAMYAS JEWELLER
## Jewellery Savings Scheme Management System

Production-ready monorepo for Ramyas Jeweller Savings Scheme, containing the Admin Web application, Customer Android App, Shared TypeScript utilities, and Supabase backend configuration.

---

## 📁 Repository Structure

```
E:\Jewellery App\
├── admin-web/       # Next.js App Router (TypeScript, Tailwind CSS, shadcn/ui ready)
├── customer-app/    # React Native + Expo (TypeScript, Expo Router, Android-focused)
├── shared/          # Shared domain types, constants, and validators
├── supabase/        # Database migrations, functions, and seed data
├── docs/            # Architecture, setup instructions, and business rules
├── .gitignore       # Root Git ignore rules
├── README.md        # Workspace documentation
└── package.json     # Root orchestration and scripts
```

---

## 🚀 Quick Start

### 1. Admin Web
```bash
# Run Admin Web in development mode (http://localhost:3000)
npm run dev:admin

# Or directly in admin-web/
cd admin-web
npm run dev
```

### 2. Customer Android App
```bash
# Run Customer App in development mode
npm run dev:customer

# Run Customer App on Android
npm run android:customer

# Or directly in customer-app/
cd customer-app
npm run android
```

---

## 📚 Documentation

- [Project Architecture](docs/PROJECT_ARCHITECTURE.md)
- [Development Setup](docs/DEVELOPMENT_SETUP.md)
- [Confirmed Business Rules](docs/BUSINESS_RULES.md)
