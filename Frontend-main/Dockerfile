# Next in standalone mode: the build emits a server plus only the packages it
# actually imports, so the runtime image carries no node_modules tree.
#
# The NEXT_PUBLIC_* values are build arguments, not runtime variables -- Next
# inlines them into the browser bundle at build time. Pointing the storefront at
# a different API means rebuilding this image.

FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=
ARG NEXT_PUBLIC_STRIPE_KEY=
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY
RUN npm run build -- --webpack

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
