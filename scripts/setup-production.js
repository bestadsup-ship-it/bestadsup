#!/usr/bin/env node

/**
 * Production Setup Helper
 * Validates and helps configure production environment variables
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_PATH = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '..', '.env.example');

console.log('🚀 BestAdsUp Production Setup Helper\n');

// Check if .env exists
if (!fs.existsSync(ENV_PATH)) {
  console.log('❌ .env file not found!');
  console.log('\n📝 Creating .env from .env.example...\n');

  if (fs.existsSync(ENV_EXAMPLE_PATH)) {
    fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
    console.log('✅ Created .env file\n');
  } else {
    console.error('❌ .env.example not found! Cannot create .env');
    process.exit(1);
  }
}

// Read current .env
const envContent = fs.readFileSync(ENV_PATH, 'utf8');
const envVars = {};

// Parse .env file
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

// Critical production variables
const CRITICAL_VARS = {
  // Security
  'JWT_SECRET': {
    description: 'JWT access token secret',
    required: true,
    isSecret: true,
    validate: (val) => val && val.length >= 32 && !val.includes('change-this'),
  },
  'JWT_REFRESH_SECRET': {
    description: 'JWT refresh token secret',
    required: true,
    isSecret: true,
    validate: (val) => val && val.length >= 32 && !val.includes('change-this'),
  },

  // Database
  'DATABASE_URL': {
    description: 'PostgreSQL connection string',
    required: true,
    validate: (val) => val && val.startsWith('postgresql://'),
  },

  // OAuth - Google
  'GOOGLE_CLIENT_ID': {
    description: 'Google OAuth Client ID',
    required: false,
    category: 'OAuth',
    validate: (val) => !val || val.includes('.apps.googleusercontent.com'),
  },
  'GOOGLE_CLIENT_SECRET': {
    description: 'Google OAuth Client Secret',
    required: false,
    isSecret: true,
    category: 'OAuth',
    validate: (val) => !val || val.startsWith('GOCSPX-'),
  },

  // OAuth - Stripe
  'STRIPE_SECRET_KEY': {
    description: 'Stripe Secret Key',
    required: true,
    isSecret: true,
    validate: (val) => val && (val.startsWith('sk_test_') || val.startsWith('sk_live_')),
  },
  'STRIPE_PUBLISHABLE_KEY': {
    description: 'Stripe Publishable Key',
    required: true,
    validate: (val) => val && (val.startsWith('pk_test_') || val.startsWith('pk_live_')),
  },
  'STRIPE_CONNECT_CLIENT_ID': {
    description: 'Stripe Connect Client ID',
    required: false,
    category: 'OAuth',
    validate: (val) => !val || val.startsWith('ca_'),
  },

  // URLs
  'FRONTEND_URL': {
    description: 'Frontend URL',
    required: true,
    validate: (val) => val && (val.startsWith('http://') || val.startsWith('https://')),
  },
  'API_BASE_URL': {
    description: 'API Base URL',
    required: true,
    validate: (val) => val && (val.startsWith('http://') || val.startsWith('https://')),
  },
};

// Validation results
const issues = [];
const warnings = [];
const configured = [];
const missing = [];

console.log('🔍 Checking configuration...\n');

// Check each critical variable
Object.keys(CRITICAL_VARS).forEach(varName => {
  const config = CRITICAL_VARS[varName];
  const value = envVars[varName];

  if (!value || value === '') {
    if (config.required) {
      issues.push(`❌ ${varName}: Missing (${config.description})`);
      missing.push(varName);
    } else {
      warnings.push(`⚠️  ${varName}: Not configured (${config.description}) - ${config.category || 'Optional'}`);
    }
  } else {
    if (config.validate && !config.validate(value)) {
      issues.push(`❌ ${varName}: Invalid format (${config.description})`);
    } else {
      const displayValue = config.isSecret ? '***configured***' : value;
      configured.push(`✅ ${varName}: ${displayValue}`);
    }
  }
});

// Display results
if (configured.length > 0) {
  console.log('✅ Configured Variables:\n');
  configured.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  Optional Variables (Demo Mode):\n');
  warnings.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (issues.length > 0) {
  console.log('❌ Issues Found:\n');
  issues.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

// OAuth status
console.log('📡 OAuth Status:\n');

const oauthServices = [
  {
    name: 'Google Analytics',
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
  },
  {
    name: 'HubSpot',
    clientId: 'HUBSPOT_CLIENT_ID',
    clientSecret: 'HUBSPOT_CLIENT_SECRET',
  },
  {
    name: 'Stripe Connect',
    clientId: 'STRIPE_CONNECT_CLIENT_ID',
    clientSecret: 'STRIPE_SECRET_KEY',
  },
];

oauthServices.forEach(service => {
  const hasClientId = envVars[service.clientId] && envVars[service.clientId] !== '';
  const hasClientSecret = envVars[service.clientSecret] && envVars[service.clientSecret] !== '';

  if (hasClientId && hasClientSecret) {
    console.log(`   ✅ ${service.name}: Configured (Production OAuth)`);
  } else {
    console.log(`   ⚠️  ${service.name}: Demo Mode (missing OAuth credentials)`);
  }
});

console.log('');

// Generate secrets helper
if (missing.includes('JWT_SECRET') || missing.includes('JWT_REFRESH_SECRET')) {
  console.log('🔑 Generate Secure Secrets:\n');

  if (missing.includes('JWT_SECRET')) {
    const secret = crypto.randomBytes(32).toString('hex');
    console.log(`   JWT_SECRET=${secret}`);
  }

  if (missing.includes('JWT_REFRESH_SECRET')) {
    const secret = crypto.randomBytes(32).toString('hex');
    console.log(`   JWT_REFRESH_SECRET=${secret}`);
  }

  console.log('\n   Copy these to your .env file\n');
}

// Summary
console.log('📊 Summary:\n');
console.log(`   ✅ Configured: ${configured.length}`);
console.log(`   ⚠️  Warnings: ${warnings.length}`);
console.log(`   ❌ Issues: ${issues.length}`);
console.log('');

// Production readiness
const isProductionReady = issues.length === 0;
const hasOAuth = oauthServices.some(s => {
  return envVars[s.clientId] && envVars[s.clientSecret];
});

console.log('🎯 Production Readiness:\n');

if (isProductionReady && hasOAuth) {
  console.log('   ✅ Ready for production deployment');
  console.log('   ✅ OAuth configured - Demo mode will be disabled');
} else if (isProductionReady && !hasOAuth) {
  console.log('   ⚠️  Ready for deployment with limitations');
  console.log('   ⚠️  Verification system will run in DEMO MODE');
  console.log('   💡 Configure OAuth to enable real verification');
} else {
  console.log('   ❌ Not ready for production');
  console.log('   💡 Fix the issues above before deploying');
}

console.log('');

// Next steps
console.log('📚 Next Steps:\n');

if (issues.length > 0) {
  console.log('   1. Fix issues listed above');
  console.log('   2. Run this script again to verify');
}

if (!hasOAuth) {
  console.log('   1. Configure OAuth credentials (see docs/PRODUCTION_SETUP.md)');
  console.log('   2. Update redirect URIs in OAuth provider dashboards');
  console.log('   3. Restart backend server');
  console.log('   4. Test OAuth flow in /verification page');
}

if (isProductionReady) {
  console.log('   1. Run database migrations: node scripts/run-all-migrations.js');
  console.log('   2. Review docs/PRODUCTION_SETUP.md for deployment steps');
  console.log('   3. Configure SSL certificates');
  console.log('   4. Set up monitoring and backups');
}

console.log('');
console.log('📖 Full Guide: docs/PRODUCTION_SETUP.md');
console.log('');

// Exit code
process.exit(issues.length > 0 ? 1 : 0);
