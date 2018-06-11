FROM microadam/graphicsmagick-alpine:1.3.23 AS base
FROM node:6.11.5-alpine AS build

RUN apk add --update python build-base
RUN yarn global add pkg

WORKDIR /app

COPY package*.json /app/
RUN npm install

COPY . /app/
COPY --from=base /usr/bin/gm /usr/bin/gm

FROM build AS package

RUN mv /app/locations.js.env /app/locations.js
RUN pkg -t node6-alpine-x64 /app/app.js

FROM base AS release

RUN apk add --update libstdc++ && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=build /app/app /app/darkroom
COPY --from=build /app/node_modules/mmmagic/build/Release/magic.node /app/magic.node

CMD [ "/app/darkroom" ]
