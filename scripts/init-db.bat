@echo off
REM B2B Ad Platform - Database Initialization Script (Windows)

echo 🚀 Initializing B2B Ad Platform Database...

REM Set default values
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=adplatform
set DB_USER=adplatform
set DB_PASSWORD=devpassword

echo 📊 Database: %DB_NAME%
echo 🔌 Host: %DB_HOST%:%DB_PORT%
echo 👤 User: %DB_USER%

REM Check if PostgreSQL is running
pg_isready -h %DB_HOST% -p %DB_PORT% -U %DB_USER% >nul 2>&1
if errorlevel 1 (
  echo ❌ PostgreSQL is not running or not accessible
  echo    Please start PostgreSQL and try again
  exit /b 1
)

echo ✅ PostgreSQL is running

REM Create database if it doesn't exist
echo 📦 Creating database if not exists...
set PGPASSWORD=%DB_PASSWORD%
createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% 2>nul

REM Run schema
echo 🗂️  Creating schema...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f database\schema.sql

REM Run seed data
echo 🌱 Loading seed data...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f database\seed.sql

echo ✅ Database initialization complete!
echo.
echo Test account credentials:
echo   Email: test@example.com
echo   Password: password123
echo.
echo Next steps:
echo   1. npm run dev
echo   2. Open http://localhost:3005
echo   3. Login with test credentials
