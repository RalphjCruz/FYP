FROM node:16-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npx", "nodemon", "--exec", "node --loader ts-node/esm", "src/index.ts"]