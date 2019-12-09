FROM node:lts-jessie
WORKDIR /app
ADD . .
RUN npm install
WORKDIR /app
EXPOSE 8080
RUN chmod +x ./start.sh

CMD ["./start.sh"]