FROM ghcr.io/puppeteer/puppeteer

USER root

WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY patches ./patches

RUN npm install

COPY src ./src

RUN npm run build

USER pptruser

CMD ["npm","run","start"]