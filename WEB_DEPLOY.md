# VCF Converter Web Docker 部署

## 运行

```bash
docker compose up -d --build
```

默认端口为 `8080`，启动后访问：

```text
http://localhost:8080
```

## 停止

```bash
docker compose down
```

## 说明

- 当前 Docker 部署的是 Web 前端静态站点，不包含 Electron 桌面壳。
- **响应式设计**：代码已适配移动端。在手机或窄屏下，侧边栏会自动折叠为左侧抽屉式菜单，转换区域的设置项会自动换行以适应小屏。
- Web 环境下文件导出会走浏览器下载，不会像桌面版那样直接写入本地目录。
- **宝塔服务器部署**：
  1. 在宝塔面板中安装 Docker 管理器。
  2. 将整个项目文件夹上传到服务器。
  3. 在项目目录下执行 `docker compose up -d --build`。
  4. 如果需要通过域名访问，可在宝塔面板中创建一个静态网站，并配置反向代理指向 `http://127.0.0.1:8080`。
- 如果要修改对外端口，编辑 [docker-compose.yml](/e:/总任务/任务八-VCF转换器/vcf-converter/docker-compose.yml) 里的 `8080:80`。
