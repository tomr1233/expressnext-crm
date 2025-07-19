# Dockerfile for your new Next.js app

# 1. Builder Stage: Build the application
FROM node:18-alpine AS builder

# Declare the build arguments passed from docker-compose
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
# Add any other build-time variables here

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Make the build arguments available as environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
# AWS variables will be provided at runtime via --env-file
# Add any other build-time variables here

# Build the Next.js app (now with access to env variables)
RUN npm run build

# 2. Runner Stage: Create the final, smaller image
FROM node:18-alpine AS runner

WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Copy built assets and dependencies from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Expose the port the app will run on
EXPOSE 3001

# Start the app (make sure your package.json uses this port)
CMD ["npm", "start", "--", "-p", "3001"]
