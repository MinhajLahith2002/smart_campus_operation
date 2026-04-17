<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Smart Campus Operations Hub Frontend

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Optionally create `.env.local` from `.env.example`
3. Run the app:
   `npm run dev`

### Windows PowerShell quick start
```powershell
cd Frontend
$env:VITE_BACKEND_BASE_URL="http://127.0.0.1:8081"
npm install
npm run dev
```

## Frontend environment
- `VITE_BACKEND_BASE_URL` defaults to `http://127.0.0.1:8081`
- `VITE_MODULE_C_API_URL` optionally overrides only the ticket API base

The frontend now uses backend session auth with:
- email + password login
- Google OAuth redirect when the backend is configured for Google
- register, forgot password, reset password, email verification, and technician invite setup pages
