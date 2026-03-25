FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY src ./src
COPY locales ./locales

CMD ["npm", "run", "dev"]
