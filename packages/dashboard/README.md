# B2B Ad Platform Dashboard

A React-based dashboard for managing and monitoring the B2B advertising platform.

## Features

- User authentication (Login/Signup)
- Real-time metrics display (Impressions, Clicks, Revenue, Fill Rate)
- Date range filtering (Last 7 days, 30 days, Custom)
- Performance charts using Recharts
- Ad unit performance tracking
- Responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Update the `.env` file with your API URLs:
```
REACT_APP_CONTROL_PLANE_URL=http://localhost:3002
REACT_APP_REPORTING_URL=http://localhost:3004
```

### Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Production Build

Build the application for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Docker

### Build Docker Image

```bash
docker build -t b2b-ad-dashboard \
  --build-arg REACT_APP_CONTROL_PLANE_URL=http://localhost:3002 \
  --build-arg REACT_APP_REPORTING_URL=http://localhost:3004 \
  .
```

### Run Docker Container

```bash
docker run -p 3000:80 b2b-ad-dashboard
```

The dashboard will be available at `http://localhost:3000`

## Project Structure

```
dashboard/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   └── client.js          # API client with auth
│   ├── components/
│   │   ├── AdUnitsList.js     # Ad units table
│   │   ├── DateRangePicker.js # Date range selector
│   │   ├── MetricCard.js      # Metric display card
│   │   └── MetricsChart.js    # Charts component
│   ├── pages/
│   │   ├── Dashboard.js       # Main dashboard page
│   │   ├── Login.js           # Login page
│   │   └── Signup.js          # Signup page
│   ├── styles/
│   │   ├── auth.css           # Auth page styles
│   │   ├── components.css     # Component styles
│   │   ├── dashboard.css      # Dashboard styles
│   │   └── global.css         # Global styles
│   ├── App.js                 # Root component
│   └── index.js               # Entry point
├── Dockerfile
├── nginx.conf
├── package.json
└── webpack.config.js
```

## API Integration

The dashboard integrates with two backend services:

### Control Plane API (Port 3002)
- `/auth/login` - User login
- `/auth/signup` - User registration
- `/ad-units` - Ad unit management

### Reporting API (Port 3004)
- `/metrics` - Overall metrics
- `/metrics/daily` - Daily time series data
- `/metrics/ad-units` - Per ad unit performance

## Authentication

The dashboard uses JWT tokens stored in localStorage for authentication. The token is automatically included in all API requests via Axios interceptors.

## Environment Variables

- `REACT_APP_CONTROL_PLANE_URL` - Control plane API URL (default: http://localhost:3002)
- `REACT_APP_REPORTING_URL` - Reporting API URL (default: http://localhost:3004)
