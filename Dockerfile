FROM node:8.11.2-alpine AS build

RUN apk add --update \
    python \
    build-base \
  && rm -rf /var/cache/apk/*

RUN yarn global add pkg

FROM microadam/graphicsmagick-alpine:1.3.28 AS release

RUN apk add --update libstdc++ libgcc && rm -rf /var/cache/apk/*

WORKDIR /app
COPY darkroom .
COPY node_modules/mmmagic/build/Release/magic.node .

CMD /app/darkroom
