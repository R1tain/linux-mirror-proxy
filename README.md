# Linux Mirror Proxy 

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/linux-mirror-proxy)

基於 Cloudflare Workers 的 Linux 發行版鏡像反向代理服務，具備自動架構識別功能。這個代理服務能夠智能檢測系統架構（x86/x64、ARM、RISC-V 等），並自動選擇正確的源，加速軟件包下載和系統更新。

## 🌟 主要特點

- **智能架構識別**：自動檢測並適配不同的系統架構（x86/x64、ARM64、RISC-V）
- **廣泛支持**：覆蓋多種主流 Linux 發行版，包括 Ubuntu、Debian、CentOS、Fedora 等
- **全球加速**：基於 Cloudflare 全球網絡，減少下載延遲和提高穩定性
- **簡單配置**：一鍵部署，使用方便的配置腳本快速設置
- **無需伺服器**：利用 Cloudflare Workers 的無伺服器架構，零維護成本

## 📋 支持的 Linux 發行版

| 發行版 | 支持架構 | 智能識別 |
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

### 方法一：點擊部署按鈕

點擊上方的"Deploy to Cloudflare Workers"按鈕，登錄到您的 Cloudflare 帳戶，然後按照指示完成部署。

### 方法二：手動部署

1. 在 Cloudflare Dashboard 中創建新的 Worker
2. 複製本倉庫中的 `worker.js` 代碼
3. 粘貼到 Worker 編輯器中並部署

## 💻 使用方法

部署完成後，您會獲得一個 `*.workers.dev` 域名。訪問這個網址可以看到配置指南頁面，其中包含了不同 Linux 發行版的一鍵配置腳本。

### 範例（Ubuntu）：

```bash
sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/apt/sources.list /etc/apt/sources.list.bak.$TIMESTAMP && if grep -q "ubuntu-ports" /etc/apt/sources.list; then
  # ARM64 版本的 Ubuntu
  sed -i "s|http://ports.ubuntu.com/ubuntu-ports/|https://your-worker.workers.dev/ubuntu-arm/|g" /etc/apt/sources.list
  sed -i "s|http://ports.ubuntu.com/ubuntu-ports|https://your-worker.workers.dev/ubuntu-arm|g" /etc/apt/sources.list
else
  # 標準 x86/x64 版本的 Ubuntu
  sed -i "s|http://archive.ubuntu.com/ubuntu/|https://your-worker.workers.dev/ubuntu/|g" /etc/apt/sources.list
  sed -i "s|http://security.ubuntu.com/ubuntu/|https://your-worker.workers.dev/ubuntu/|g" /etc/apt/sources.list
fi && apt update && echo "已備份原配置至 /etc/apt/sources.list.bak.$TIMESTAMP 並更新完成！"'

## 🛠️ 工作原理

1. 當用戶使用代理鏡像網址訪問時，Cloudflare Worker 會攔截請求
2. Worker 分析請求路徑，智能判斷目標發行版和架構類型
3. 根據判斷結果，Worker 修改請求並將其轉發到對應的官方鏡像源
4. 回應被返回給用戶，同時保持內容完整性

代理路徑示例：
- `/ubuntu/` → `http://archive.ubuntu.com/ubuntu/` (x86/x64)
- `/ubuntu-arm/` → `http://ports.ubuntu.com/ubuntu-ports/` (ARM64)
- `/debian/` → `http://deb.debian.org/debian` (x86/x64)
- `/debian-ports/` → `http://deb.debian.org/debian-ports` (ARM/RISC-V)

## 📊 性能與限制

- Cloudflare Workers 免費版每日有 100,000 次請求限制
- 單次請求最大處理時間為 10ms（付費版 50ms）
- 每個請求最大傳輸大小為 128MB

對於大多數日常使用和小型服務器場景，這些限制已經足夠。

## 🔧 自定義與擴展

您可以通過修改 `worker.js` 文件來支持更多 Linux 發行版或優化現有功能：

```javascript
// 添加新的發行版支持
const newRepositories = {
  '/newdistro': 'http://mirror.newdistro.org/packages',
};

## 🤝 貢獻
歡迎提交 Pull Requests 來改進代碼或添加新功能！如果您有任何問題或建議，請創建 Issue。

## 📜 許可證
本項目採用 MIT 許可證 - 詳細信息請查看 LICENSE 文件。

## ⚠️ 免責聲明
此代理服務僅用於學習和測試目的，不保證永久可用性和完整性。使用前請務必備份您的系統配置。
