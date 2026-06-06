FROM ghcr.io/puppeteer/puppeteer

USER root

# Install Firefox/Camoufox dependencies not included in puppeteer base image
RUN apt-get update && apt-get install -y --no-install-recommends \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxtst6 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-glib-1-2 \
    libgtk-3-0 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

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

RUN mkdir -p /app/debug && chown pptruser:pptruser /app/debug

USER pptruser

CMD ["npm", "run", "start"]