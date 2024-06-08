FROM alpine

#to be run from parent directory

RUN apk update
RUN apk add --update npm

WORKDIR /root
ADD www www
ADD _platform _platform

WORKDIR /root/_platform/gce
RUN npm install .

WORKDIR /root/www/server
RUN npm install .

ENTRYPOINT ["npm","start"]