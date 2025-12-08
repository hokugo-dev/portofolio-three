FROM node:22-bookworm

WORKDIR /apps

EXPOSE 5174

RUN apt-get install git
