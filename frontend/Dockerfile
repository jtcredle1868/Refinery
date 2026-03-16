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

# Use a template so Railway's $PORT and $BACKEND_URL are substituted at container start.
# nginx:alpine automatically processes files in /etc/nginx/templates/ via envsubst.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
