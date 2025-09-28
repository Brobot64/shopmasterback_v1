# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --production --frozen-lockfile

# Copy application files
COPY . .

# Create build output
RUN yarn build

# Expose default port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["yarn", "start"]