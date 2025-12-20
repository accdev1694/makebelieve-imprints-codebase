module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/index.js',
      cwd: '/home/deploy/app/backend',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '/var/log/pm2/backend-error.log',
      out_file: '/var/log/pm2/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}

// Frontend is deployed on Vercel
// This PM2 config only manages the backend API server on IONOS VPS
