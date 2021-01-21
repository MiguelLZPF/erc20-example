FROM node:12
WORKDIR /usr/src/app/

COPY ./ ./

RUN npm install
RUN npm audit fix
RUN npm run build

EXPOSE 3000
CMD node dist/src/server.js