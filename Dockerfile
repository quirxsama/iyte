# Node.js LTS Alpine Image
FROM node:20-alpine

# better-sqlite3 için build araçları
RUN apk add --no-cache python3 make g++

# Çalışma dizini
WORKDIR /app

# Package dosyasını kopyala
COPY package.json ./

# Bağımlılıkları yükle (npm install — lock dosyası gerektirmez)
RUN npm install --omit=dev

# Kaynak kodları kopyala
COPY . .

# Data klasörü için volume
VOLUME ["/app/data"]

# Botu başlat
CMD ["npm", "start"]
