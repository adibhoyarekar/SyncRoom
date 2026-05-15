FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

# Railway injects PORT dynamically — EXPOSE is just documentation
EXPOSE ${PORT:-4000}

CMD ["npm", "start"]
