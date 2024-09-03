# Stage 1: Base image with pnpm and app setup
FROM node:20-alpine AS base

# Install pnpm via corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set the working directory
WORKDIR /app

# Copy only package.json and pnpm-lock.yaml first to leverage Docker cache for dependencies
COPY package.json pnpm-lock.yaml ./

# Stage 2: Install all dependencies
FROM base AS prod-deps

# Install dependencies with cache to speed up rebuilds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Final image
FROM base

COPY --from=prod-deps /app/node_modules /app/node_modules

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Run the application in development mode
CMD [ "pnpm", "dev" ]
