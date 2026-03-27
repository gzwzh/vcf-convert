# 浣跨敤鍥藉唴闀滃儚婧?FROM m.daocloud.io/docker.io/library/node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
# 浣跨敤娣樺疂闀滃儚鍔犻€?npm 瀹夎
RUN npm config set registry https://registry.npmmirror.com && npm ci

COPY . .
RUN npm run build

# 浣跨敤鍥藉唴闀滃儚婧?FROM m.daocloud.io/docker.io/library/nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
