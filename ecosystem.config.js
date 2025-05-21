module.exports = {
    apps: [
      {
        name: 'pupsnatch',
        script: './dist/src/app.ts',
        interpreter: 'node',
        env: {
          NODE_ENV: 'production',
        },
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
      },
    ],
  };