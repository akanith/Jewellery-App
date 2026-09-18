# Development Setup - Ramyas Jeweller

## 1. Prerequisites

- **Operating System:** Windows, macOS, or Linux
- **Node.js:** `v20.x` or higher (Current environment: `v24.20.0`)
- **npm:** `v10.x` or higher (Current environment: `11.19.0`)
- **Git:** Installed and available on PATH
- **Android Development (Customer App):**
  - Android Studio / Android SDK (for Android emulator or local build)
  - Alternatively, Expo Go app installed on an Android device

---

## 2. Monorepo Structure

```
E:\Jewellery App\
├── admin-web/       # Next.js Admin Dashboard
├── customer-app/    # Expo Customer Android App
├── shared/          # Shared TypeScript code
├── supabase/        # Database migrations and configurations
└── docs/            # Documentation
```

---

## 3. Installation

From the root workspace folder (`E:\Jewellery App`):

```bash
# Install root dependencies
npm install

# Alternatively, install individual package dependencies:
cd admin-web && npm install
cd ../customer-app && npm install
cd ../shared && npm install
```

---

## 4. Running the Applications

### Admin Web Application (Next.js)

To run Admin Web in development mode:

```bash
# From repository root:
npm run dev:admin

# Or directly from admin-web folder:
cd admin-web
npm run dev
```

The Admin Web dashboard will be available at `http://localhost:3000`.

### Customer Android App (React Native / Expo)

To run Customer App:

```bash
# From repository root:
npm run dev:customer

# Or directly from customer-app folder:
cd customer-app
npm run android
# or
npm start
```

Press `a` in the Expo terminal interface to open the app on an active Android emulator or connected device.

---

## 5. Typechecking & Linting

```bash
# Lint Admin Web
npm run lint:admin

# Lint Customer App
npm run lint:customer
```
