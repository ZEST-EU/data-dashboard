# syntax=docker/dockerfile:1

# --- Build stage: compile the Vite/React app to static files -----------------
FROM node:20-alpine AS build
WORKDIR /app

# Install against the lockfile for reproducible builds (cache-friendly: deps
# only reinstall when the manifests change).
COPY package.json package-lock.json ./
RUN npm ci

# The static bundle only ever calls same-origin /api/* paths, so no backend URLs
# or tenant are baked in here — nginx resolves those at runtime.
COPY . .
RUN npm run build

# --- Runtime stage: serve the SPA + reverse-proxy the FIWARE backends --------
FROM nginx:1.27-alpine AS runtime

# Backend wiring, overridable at deploy time (`docker run -e ...` or k8s env).
# Defaults target the in-cluster k8s service names and match the dev .env values.
ENV ORION_URL=http://orion:1026
ENV QUANTUMLEAP_URL=http://quantumleap:8668
ENV ORION_TENANT=opcua_biopc
ENV NGSILD_CONTEXT=https://raw.githubusercontent.com/smart-data-models/dataModel.Device/master/context.jsonld
# Restrict nginx's startup envsubst to exactly our placeholders, so nginx's own
# runtime variables ($host, $uri, ...) are never touched.
ENV NGINX_ENVSUBST_FILTER="^(ORION_URL|QUANTUMLEAP_URL|ORION_TENANT|NGSILD_CONTEXT)\$"

# nginx's entrypoint renders every *.template here through envsubst at startup,
# writing the result to /etc/nginx/conf.d/ (so this replaces the stock default).
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# CMD is inherited from the base image (envsubst entrypoint -> nginx -g daemon off).
