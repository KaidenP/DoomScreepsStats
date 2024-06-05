FROM node:latest
LABEL authors="Kaiden"

RUN npm install -g yarn
RUN mkdir /app
COPY ./package.json /app
COPY ./yarn.lock /app
WORKDIR /app
RUN yarn

ADD . /app
RUN yarn build
ENTRYPOINT ["node", "/app/dist/main.js"]