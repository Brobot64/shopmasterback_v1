# Environment Configuration Guide

This project supports different configurations for development and production environments.

## Quick Start

### Development (Local PostgreSQL + No Redis)
```bash
# Windows PowerShell
.\run-env.ps1 development

# Or using npm directly
npm run dev
```

### Production (Supabase + Redis)
```bash
# Windows PowerShell  
.\run-env.ps1 production

# Or using npm directly
npm run dev:prod
```

## Environment Configurations

### Development Environment
- **Database**: Local PostgreSQL
  - Host: `localhost:5432`
  - Database: `shopmaster`
  - Username: `postgres`
  - Password: `postgres`
- **Redis**: Disabled
- **Config File**: `.env.development`
- **SSL**: Disabled (for local database)

### Production Environment
- **Database**: Supabase
  - Host: `aws-0-eu-north-1.pooler.supabase.com:5432`
  - Database: `postgres`
- **Redis**: Enabled (Redis Cloud)
- **Config File**: `.env`
- **SSL**: Enabled (required for Supabase)

## Prerequisites

### For Development
1. **PostgreSQL**: Install PostgreSQL locally
   ```bash
   # Windows (using chocolatey)
   choco install postgresql

   # Or download from: https://www.postgresql.org/download/
   ```

2. **Create Database**:
   ```sql
   -- Connect to PostgreSQL as superuser
   CREATE DATABASE shopmaster;
   
   -- Grant permissions to postgres user
   GRANT ALL PRIVILEGES ON DATABASE shopmaster TO postgres;
   ```

3. **Verify Connection**:
   ```bash
   psql -h localhost -U postgres -d shopmaster
   ```

### For Production
- Supabase credentials (already configured)
- Redis Cloud credentials (already configured)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development with local PostgreSQL |
| `npm run dev:local` | Explicit development with `.env.development` |
| `npm run dev:prod` | Development server with production config |
| `npm start` | Production build |
| `npm run start:prod` | Production build with explicit NODE_ENV |

## Configuration Files

### `.env.development`
- Local PostgreSQL settings
- Redis disabled
- Development-optimized connection pools

### `.env` 
- Supabase settings
- Redis enabled
- Production-optimized connection pools

## Environment Variables

### Database
- `DB_HOST`: Database host (localhost vs Supabase)
- `DB_PORT`: Database port (5432)
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `DB_DATABASE`: Database name

### Redis
- `REDIS_ENABLED`: Enable/disable Redis (true/false)
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis password

### Performance
- `DB_POOL_MAX`: Maximum database connections
- `DB_POOL_MIN`: Minimum database connections
- `DB_TIMEOUT`: Connection timeout

## Troubleshooting

### Local Development Issues

1. **Database Connection Failed**:
   ```
   Error: connect ECONNREFUSED 127.0.0.1:5432
   ```
   - Ensure PostgreSQL is running
   - Check if database `shopmaster` exists
   - Verify username/password

2. **Permission Denied**:
   ```
   Error: password authentication failed
   ```
   - Reset postgres user password:
   ```sql
   ALTER USER postgres PASSWORD 'postgres';
   ```

3. **Database Does Not Exist**:
   ```
   Error: database "shopmaster" does not exist
   ```
   - Create the database:
   ```sql
   CREATE DATABASE shopmaster;
   ```

### Production Issues

1. **Supabase Connection Issues**:
   - Check environment variables in `.env`
   - Verify SSL settings
   - Check Supabase dashboard for connection limits

2. **Redis Connection Issues**:
   - Verify Redis credentials
   - Check network connectivity
   - Review Redis Cloud dashboard

## Switching Between Environments

The application automatically detects the environment based on:
1. `NODE_ENV` environment variable
2. `DB_HOST` value (localhost = development)

### Manual Environment Override
```bash
# Force development mode
NODE_ENV=development npm run dev

# Force production mode  
NODE_ENV=production npm run dev
```

## Database Migrations

### Development
```bash
# Generate migration
npm run migration:generate

# Run migrations
npm run migration:run
```

### Production
```bash
# Set production environment
NODE_ENV=production npm run migration:run
```

## Monitoring

### Development
- Detailed error logging
- SQL query logging
- No rate limiting (easier testing)

### Production  
- Error-only logging
- Connection pooling optimized
- Full security headers
- Rate limiting enabled (if Redis available)

## Security Notes

- Never commit `.env` files to version control
- Use strong passwords in production
- Keep Supabase keys secure
- Regular security audits for dependencies
