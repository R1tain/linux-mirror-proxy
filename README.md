# Linux Mirror Proxy 

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/linux-mirror-proxy)

基于 Cloudflare Workers 的 Linux 发行版镜像反向代理服务，具备自动架构识别功能。这个代理服务能够智能检测系统架构（x86/x64、ARM、RISC-V 等），并自动选择正确的源，加速软件包下载和系统更新。

## 🌟 主要特点

- **智能架构识别**：自动检测并适配不同的系统架构（x86/x64、ARM64、RISC-V）
- **广泛支持**：覆盖多种主流 Linux 发行版，包括 Ubuntu、Debian、CentOS、Fedora 等
- **全球加速**：基于 Cloudflare 全球网络，减少下载延迟和提高稳定性
- **简单配置**：一键部署，使用方便的配置脚本快速设置
- **无需服务器**：利用 Cloudflare Workers 的无服务器架构，零维护成本

## 📋 支持的 Linux 发行版

| 发行版 | 支持架构 | 智能识别 |
|--------|----------|----------|
| Ubuntu | x86/x64, ARM64 | ✅ |
| Debian | x86/x64, ARM, RISC-V | ✅ |
| CentOS/RHEL | x86/x64 | ❌ |
| Fedora | x86/x64, RISC-V | ❌ |
| Arch Linux | x86/x64 | ❌ |
| Alpine | x86/x64, ARM, RISC-V | ✅ |
| Raspbian | ARM | - |
| Armbian | ARM | - |
| Arch Linux ARM | ARM | - |

## 🚀 快速部署

### 方法一：点击部署按钮

点击上方的"Deploy to Cloudflare Workers"按钮，登录到您的 Cloudflare 账户，然后按照指示完成部署。

### 方法二：手动部署

1. 在 Cloudflare Dashboard 中创建新的 Worker
2. 复制本仓库中的 `worker.js` 代码
3. 粘贴到 Worker 编辑器中并部署

## 💻 使用方法

部署完成后，您会获得一个 `*.workers.dev` 域名。访问这个网址可以看到配置指南页面，其中包含了不同 Linux 发行版的一键配置脚本。

### 范例（Ubuntu）：

```bash
sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/apt/sources.list /etc/apt/sources.list.bak.$TIMESTAMP && if grep -q "ubuntu-ports" /etc/apt/sources.list; then
  # ARM64 版本的 Ubuntu
  sed -i "s|http://ports.ubuntu.com/ubuntu-ports/|https://your-worker.workers.dev/ubuntu-arm/|g" /etc/apt/sources.list
  sed -i "s|http://ports.ubuntu.com/ubuntu-ports|https://your-worker.workers.dev/ubuntu-arm|g" /etc/apt/sources.list
else
  # 标准 x86/x64 版本的 Ubuntu
  sed -i "s|http://archive.ubuntu.com/ubuntu/|https://your-worker.workers.dev/ubuntu/|g" /etc/apt/sources.list
  sed -i "s|http://security.ubuntu.com/ubuntu/|https://your-worker.workers.dev/ubuntu/|g" /etc/apt/sources.list
fi && apt update && echo "已备份原配置至 /etc/apt/sources.list.bak.$TIMESTAMP 并更新完成！"'

```

## 🛠️ 工作原理

1. 当用户使用代理镜像网址访问时，Cloudflare Worker 会拦截请求
2. Worker 分析请求路径，智能判断目标发行版和架构类型
3. 根据判断结果，Worker 修改请求并将其转发到对应的官方镜像源
4. 响应被返回给用户，同时保持内容完整性

代理路径示例：
- `/ubuntu/` → `http://archive.ubuntu.com/ubuntu/` (x86/x64)
- `/ubuntu-arm/` → `http://ports.ubuntu.com/ubuntu-ports/` (ARM64)
- `/debian/` → `http://deb.debian.org/debian` (x86/x64)
- `/debian-ports/` → `http://deb.debian.org/debian-ports` (ARM/RISC-V)


## 📊 性能与限制

- Cloudflare Workers 免费版每日有 100,000 次请求限制
- 单次请求最大处理时间为 10ms（付费版 50ms）
- 每个请求最大传输大小为 128MB

对于大多数日常使用和小型服务器场景，这些限制已经足够。

## 🔧 自定义与扩展

您可以通过修改 `worker.js` 文件来支持更多 Linux 发行版或优化现有功能：

```javascript
// 添加新的发行版支持
const newRepositories = {
  '/newdistro': 'http://mirror.newdistro.org/packages',
};
```
## 🤝 贡献
欢迎提交 Pull Requests 来改进代码或添加新功能！如果您有任何问题或建议，请创建 Issue。

## 📜 许可证
本项目采用 MIT 许可证 - 详细信息请查看 LICENSE 文件。

## ⚠️ 免责声明
此代理服务仅用于学习和测试目的，不保证永久可用性和完整性。使用前请务必备份您的系统配置。


