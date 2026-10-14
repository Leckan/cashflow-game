FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g npm@11
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "node --experimental-strip-types src/lib/db/migrate.ts && node --experimental-strip-types src/lib/db/seed.ts && npm run start"]
