FROM node:14 AS builder

WORKDIR /app

COPY package*json /app/

RUN npm ci

COPY src /app/src
COPY tsconfig.json /app

RUN npx tsc && npm ci --production

FROM node:14-alpine as main

WORKDIR /app
COPY --from=builder /app /app/

RUN apk --no-cache add curl libwebp libwebp-tools tesseract-ocr tesseract-ocr-data-pol

CMD 'node' '--enable-source-maps' '.'
