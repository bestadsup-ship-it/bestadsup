#!/bin/bash

# B2B Ad Platform - Database Initialization Script

set -e

echo "🚀 Initializing B2B Ad Platform Database..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Default values if not set
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-adplatform}"
DB_USER="${DB_USER:-adplatform}"
DB_PASSWORD="${DB_PASSWORD:-devpassword}"

echo "📊 Database: $DB_NAME"
echo "🔌 Host: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not running or not accessible"
  echo "   Please start PostgreSQL and try again"
  exit 1
fi

echo "✅ PostgreSQL is running"

# Create database if it doesn't exist
echo "📦 Creating database if not exists..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Run schema
echo "🗂️  Creating schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql

# Run seed data
echo "🌱 Loading seed data..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/seed.sql

echo "✅ Database initialization complete!"
echo ""
echo "Test account credentials:"
echo "  Email: test@example.com"
echo "  Password: password123"
echo ""
echo "Next steps:"
echo "  1. npm run dev"
echo "  2. Open http://localhost:3005"
echo "  3. Login with test credentials"
