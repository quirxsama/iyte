# Node.js LTS Alpine Image
FROM node:20-alpine

# better-sqlite3 için build araçları + pnpm
RUN apk add --no-cache python3 make g++ && \
    corepack enable && corepack prepare pnpm@latest --activate

# Çalışma dizini
WORKDIR /app

# Package ve lock dosyalarını kopyala
COPY package.json pnpm-lock.yaml ./

# Bağımlılıkları yükle
RUN pnpm install --frozen-lockfile --prod

# Kaynak kodları kopyala
COPY . .

# Data klasörü için volume
VOLUME ["/app/data"]

# Botu başlat
CMD ["pnpm", "start"]
