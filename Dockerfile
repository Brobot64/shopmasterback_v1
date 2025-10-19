# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including dev dependencies for build)
RUN yarn install --frozen-lockfile

# Copy application files
COPY . .

# Create build output
RUN yarn build

# Remove dev dependencies after build
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Expose default port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["yarn", "start"]