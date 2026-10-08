FROM node:22-alpine
WORKDIR /app
COPY . .
RUN node server/render/render.js /tmp/check && rm -rf /tmp/check
ENV NODE_ENV=production DATA_DIR=/data TRUST_PROXY=1
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
EXPOSE 3000
USER node
CMD ["node", "--disable-warning=ExperimentalWarning", "server/server.js"]
