FROM node:25-alpine
WORKDIR /usr/src
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]