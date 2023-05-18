FROM node:18.16.0-alpine AS build

RUN apk add --update \
    python3 \
    build-base \
    libstdc++ \
    libjpeg-turbo-dev \
    libpng-dev \
    libwebp-dev \
    gifsicle \
    graphicsmagick \
    git \
  && rm -rf /var/cache/apk/*

COPY . .

COPY locations.js.env locations.js

RUN yarn install && yarn cache clean

CMD ["node", "app.js"]
