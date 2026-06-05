FROM ghcr.io/puppeteer/puppeteer

USER root

WORKDIR /app

COPY tsconfig.json .
COPY package.json .
COPY package-lock.json .
COPY ./patches ./patches

RUN npm install

ENV CAMOUFOX_CACHE_DIR=/home/pptruser/.cache/camoufox

RUN mkdir -p /home/pptruser/.cache/camoufox \
 && chown -R pptruser:pptruser /home/pptruser/.cache

USER pptruser
RUN npx camoufox fetch

USER root

COPY ./src ./src
RUN npm run build

USER pptruser

CMD ["npm", "run", "start"]