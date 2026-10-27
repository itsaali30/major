FROM node:20-slim

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install && npx prisma generate

COPY . .

EXPOSE 4000

ENV PORT=4000

CMD ["node", "server.js"]
