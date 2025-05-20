module.exports = {
    apps: [
      {
        name: 'web-image-scraper',
        script: 'src/app.js',
        env: {
          NODE_ENV: 'production',
        },
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
      },
    ],
  };