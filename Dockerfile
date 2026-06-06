FROM ghcr.io/puppeteer/puppeteer

WORKDIR /app

COPY tsconfig.json .
COPY package.json .
COPY package-lock.json .
COPY ./patches ./patches
RUN npm install

COPY ./src ./src
RUN npm run build

RUN mkdir -p /app/debug

CMD ["npm", "run", "start"]
