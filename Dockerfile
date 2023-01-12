FROM node:14.16.1-alpine AS build

RUN apk add --update \
    python \
    build-base \
    libstdc++ \
    libjpeg-turbo-dev \
    libpng-dev \
    libwebp-dev \
    gifsicle \
    graphicsmagick \
  && rm -rf /var/cache/apk/*

COPY . .

COPY locations.js.env locations.js

RUN yarn install && yarn cache clean

CMD ["node", "app.js"]
