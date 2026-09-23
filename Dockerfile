FROM node:20-alpine AS base

RUN apk add --no-cache dumb-init

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

EXPOSE 5000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["npm", "start"]
