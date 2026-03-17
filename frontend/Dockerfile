FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# VITE_API_URL must be set at build time so Vite bakes it into the bundle.
# In Railway: set VITE_API_URL as a build-time variable pointing to the backend service URL.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /tmp/nginx.conf.template

# Default values — overridden by Railway environment variables at runtime.
# BACKEND_URL: set to your Railway backend service URL (e.g. https://refinery-backend.up.railway.app)
# PORT: Railway injects this automatically
ENV PORT=80
ENV BACKEND_URL=http://localhost:8000

# envsubst substitutes ONLY ${PORT} and ${BACKEND_URL} — leaves nginx's own
# $uri, $host, $remote_addr, etc. untouched.
CMD ["/bin/sh", "-c", "envsubst '${PORT} ${BACKEND_URL}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
