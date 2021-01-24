FROM node:12
WORKDIR /home/server

COPY ./src ./src
COPY ./test ./test
COPY ./.env* ./
COPY ./init-mongo.js ./
COPY ./package.json ./
COPY ./tsconfig.json ./

# Check file structure
# RUN ls -lah

RUN npm install
RUN npm audit fix
RUN npm run build

EXPOSE 3000
RUN ls -lah
CMD node dist/src/server.js