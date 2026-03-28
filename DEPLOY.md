# Deploy ke VPS

## Requirement sistem

- Ubuntu/Debian server
- Node.js 20+ atau 22 LTS
- PM2

Contoh install dasar:

```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## Deploy aplikasi

Clone repo ke VPS:

```bash
cd /var/www
git clone https://github.com/dameepng/choppercare-web.git
cd choppercare-web
```

Siapkan env:

```bash
cp .env.local.example .env.local
nano .env.local
```

Kalau frontend dan API ada di domain yang sama, pakai:

```env
NEXT_PUBLIC_API_URL=https://choppercare.toeanmuda.id
```

Jalankan deploy:

```bash
chmod +x deploy.sh
./deploy.sh
```

Frontend berjalan di port `3000` via PM2.

## Update berikutnya

```bash
cd /var/www/choppercare-web
./deploy.sh
```

## Nginx reverse proxy

Contoh server block jika domain frontend dan API sama:

```nginx
server {
    server_name choppercare.toeanmuda.id;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }

    location /health {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
    }
}
```
