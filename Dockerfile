FROM node:20-alpine

WORKDIR /usr/src/app

# Configurar zona horaria de Chile (MINEDUC / Reloj Control)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/America/Santiago /etc/localtime && \
    echo "America/Santiago" > /etc/timezone

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Utiliza el flag nativo --watch de Node.js para recarga en caliente en desarrollo
CMD ["npm", "run", "dev"]

