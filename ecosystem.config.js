const path = require("path");

const appDir = __dirname;
const logDir = path.join(appDir, "logs");

module.exports = {
  apps: [
    {
      name: "choppercare-web",
      script: "./node_modules/next/dist/bin/next",
      args: "start --hostname 0.0.0.0 --port 3000",
      cwd: appDir,
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "3000",
      },
      error_file: path.join(logDir, "pm2-error.log"),
      out_file: path.join(logDir, "pm2-out.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_memory_restart: "500M",
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
