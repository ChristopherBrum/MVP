FROM node:21-alpine

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3003

CMD ["node", "dist/index.js"]

