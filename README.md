# social-network

## Fly deployment

This repository is set up as two Fly apps:

- Backend: [backend/fly.toml](backend/fly.toml)
- Frontend: [frontend/fly.toml](frontend/fly.toml)

### What is configured

- The backend listens on `PORT` and serves uploads from a Fly volume.
- CORS is driven by `FRONTEND_ORIGIN`.
- Session cookies use `SameSite=None` and `Secure=true` in production.
- The frontend uses `NEXT_PUBLIC_API_BASE_URL` at build time.

### Before deploying

1. Create the backend Fly app and volume.
2. Update the app names and domains in both `fly.toml` files.
3. Set the frontend build arg so it points to the backend Fly URL.
4. Deploy the backend first, then the frontend.