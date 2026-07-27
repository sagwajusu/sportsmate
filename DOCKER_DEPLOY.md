# SportsMate Docker Compose deployment

The frontend and backend are built as separate images. Backend secrets are
injected when the backend container starts and are not copied into either
image.

## 1. Prepare environment files

Keep the existing application environment files:

- `frontend/.env`: mounted as a BuildKit secret only while Vite builds.
- `backend/.env`: injected only when the backend container starts.

Neither file is copied into an image. Replace every placeholder in
`backend/.env`; it contains secrets such as `DATABASE_URL`, `JWT_SECRET_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and external API keys.

Before pushing, replace the default `sportsmate` image namespace in
`docker-compose.yml` with your Docker Hub username, or set
`DOCKERHUB_USERNAME` in the terminal session.

## 2. Build and test locally

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f
```

Open `http://localhost` or the configured `FRONTEND_PORT`.

## 3. Push the two images to Docker Hub

```bash
docker login
docker compose push
```

The image names are:

- `DOCKERHUB_USERNAME/sportsmate-backend:IMAGE_TAG`
- `DOCKERHUB_USERNAME/sportsmate-frontend:IMAGE_TAG`

## 4. Run on a deployment server

Copy these files to the server:

- `docker-compose.yml`
- `backend/.env` containing production runtime secrets

Then run:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

The frontend Nginx container proxies `/api/*` to the Compose service named
`backend`, so the service name must remain unchanged.

## 5. Run behind the public Oracle Nginx

The public server already uses host Nginx for ports 80 and 443, so use the
production Compose file. It binds the frontend container only to
`127.0.0.1:8080` and does not expose the backend directly.

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
```

Use `deploy/nginx/sportsmate.everytriplog.com.conf` as the host Nginx proxy
template. For an existing HTTPS server block, copy its `location /` block into
the current configuration, then verify and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The request path is:

`sportsmate.everytriplog.com` -> host Nginx -> frontend container -> backend
container -> database.

The server's `backend/.env` must include:

```env
FRONTEND_ORIGIN=https://sportsmate.everytriplog.com
```

The frontend image must be built with:

```env
VITE_API_BASE_URL=/api/v1
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
VITE_QR_PUBLIC_ORIGIN=https://sportsmate.everytriplog.com
```
