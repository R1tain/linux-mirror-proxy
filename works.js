addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // 处理根路径，返回 index.html
  if (path === '/' || path === '/index.html') {
    return getIndexHTML(request)
  }

  // 检测架构和发行版
  const { targetUrl, remainingPath } = determineTargetRepository(path, url.search)

  // 如果没有找到匹配的仓库，返回 404
  if (!targetUrl) {
    return new Response(`Repository not found: ${path}\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // 克隆请求并更新 URL
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  })

  try {
    // 获取并返回代理的回应
    const response = await fetch(modifiedRequest)

    // 克隆回应并创建一个新的回应以便修改标头
    const responseHeaders = new Headers(response.headers)

    // 在需要时加入额外的调试信息
    // responseHeaders.set('X-Original-Path', path)
    // responseHeaders.set('X-Target-Url', targetUrl)

    // 返回回应
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
  } catch (e) {
    return new Response('Error proxying to repository: ' + e.message, { status: 500 })
  }
}

// 根据请求路径智能判断目标仓库
function determineTargetRepository(path, searchParams) {
  // 基本仓库映射 - 标准 x86/x64 架构
  const baseRepositories = {
    '/ubuntu': 'http://archive.ubuntu.com/ubuntu',
    '/debian': 'http://deb.debian.org/debian',
    '/centos': 'http://mirror.centos.org/centos',
    '/fedora': 'https://mirrors.fedoraproject.org',
    '/archlinux': 'https://mirrors.kernel.org/archlinux',
    '/opensuse': 'http://download.opensuse.org',
    '/alpine': 'https://dl-cdn.alpinelinux.org/alpine',
    '/epel': 'https://dl.fedoraproject.org/pub/epel',
    '/kali': 'http://http.kali.org',
  }

  // ARM 架构特定仓库
  const armRepositories = {
    '/ubuntu-arm': 'http://ports.ubuntu.com/ubuntu-ports',
    '/ubuntu-arm64': 'http://ports.ubuntu.com/ubuntu-ports',
    '/armbian': 'https://apt.armbian.com',
    '/archlinux-arm': 'https://mirror.archlinuxarm.org',
    '/debian-arm': 'http://deb.debian.org/debian-ports',
    '/debian-arm64': 'http://deb.debian.org/debian-ports',
    '/raspbian': 'http://archive.raspbian.org/raspbian',
  }

  // RISC-V 架构特定仓库
  const riscvRepositories = {
    '/debian-riscv': 'http://deb.debian.org/debian-ports',
    '/fedora-riscv': 'https://dl.fedoraproject.org/pub/alt/risc-v',
    '/alpine-riscv': 'https://dl-cdn.alpinelinux.org/alpine/edge/releases/riscv64',
    '/opensuse-riscv': 'https://download.opensuse.org/ports/riscv'
  }

  // 合并所有仓库映射
  const repositories = {
    ...baseRepositories,
    ...armRepositories,
    ...riscvRepositories
  }

  // 第一步：尝试直接匹配完整路径前缀
  for (const [prefix, repoUrl] of Object.entries(repositories)) {
    if (path.startsWith(prefix + '/')) {
      return {
        targetUrl: repoUrl + path.substring(prefix.length) + searchParams,
        remainingPath: path.substring(prefix.length)
      }
    } else if (path === prefix) {
      // 处理精确匹配的情况
      return {
        targetUrl: repoUrl + '/' + searchParams,
        remainingPath: '/'
      }
    }
  }

  // 第二步：智能自动检测发行版与架构
  // Ubuntu 智能检测
  if (path.startsWith('/ubuntu/')) {
    // 检测路径中是否含有 ARM 架构相关关键词
    if (path.includes('/arm64/') || path.includes('/aarch64/')) {
      return {
        targetUrl: 'http://ports.ubuntu.com/ubuntu-ports' + path.substring('/ubuntu'.length) + searchParams,
        remainingPath: path.substring('/ubuntu'.length)
      }
    } else {
      // 默认为 x86/x64 架构
      return {
        targetUrl: 'http://archive.ubuntu.com/ubuntu' + path.substring('/ubuntu'.length) + searchParams,
        remainingPath: path.substring('/ubuntu'.length)
      }
    }
  }

  // Debian 智能检测
  if (path.startsWith('/debian/')) {
    // 检测路径中是否含有 ARM 或 RISC-V 架构相关关键词
    if (path.includes('/arm/') || path.includes('/arm64/') || path.includes('/aarch64/') ||
        path.includes('/riscv/') || path.includes('/riscv64/')) {
      return {
        targetUrl: 'http://deb.debian.org/debian-ports' + path.substring('/debian'.length) + searchParams,
        remainingPath: path.substring('/debian'.length)
      }
    } else {
      // 默认为 x86/x64 架构
      return {
        targetUrl: 'http://deb.debian.org/debian' + path.substring('/debian'.length) + searchParams,
        remainingPath: path.substring('/debian'.length)
      }
    }
  }

  // 如果以上都不匹配，则根据 URL 路径特征进行猜测

  // 检测 Ubuntu ARM 架构
  if (path.includes('ubuntu') && (path.includes('arm') || path.includes('aarch64'))) {
    return {
      targetUrl: 'http://ports.ubuntu.com/ubuntu-ports' + path + searchParams,
      remainingPath: path
    }
  }

  // 检测 Debian ARM/RISC-V 架构
  if (path.includes('debian') && (path.includes('arm') || path.includes('aarch64') || path.includes('riscv'))) {
    return {
      targetUrl: 'http://deb.debian.org/debian-ports' + path + searchParams,
      remainingPath: path
    }
  }

  // 默认情况下，让客户端使用更明确的路径
  return { targetUrl: null, remainingPath: null }
}

// 函数：返回 index.html 内容，并动态替换域名
function getIndexHTML(request) {
  // 获取当前请求的域名
  const currentDomain = new URL(request.url).origin

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Linux 更新源代理服务</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    pre {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      position: relative;
      padding-top: 40px;
    }
    .alert-info {border-left: 4px solid #5bc0de}
    .alert-warning {border-left: 4px solid #f0ad4e}
    .alert-success {border-left: 4px solid #5cb85c}
    .badge-arm {background-color: #6f42c1; color: white; padding: 5px 8px; border-radius: 4px; font-size: 0.85em}
    .badge-riscv {background-color: #fd7e14; color: white; padding: 5px 8px; border-radius: 4px; font-size: 0.85em}

    .copy-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 3px;
      padding: 0 6px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 20px;
      box-sizing: border-box;
    }

    .copy-btn svg {
      width: 12px;
      height: 12px;
      margin-right: 3px;
      flex-shrink: 0;
      position: relative;
      top: 0px; /* 可视需要调整，确保与文字对齐 */
    }

    /* 如果需要调整文字位置 */
    .copy-btn::after {
      content: "copy";
      position: relative;
      top: 0px; /* 可微调此值，控制文字垂直位置 */
      display: inline-block;
      line-height: 1;
    }

    /* 隐藏原始文字 */
    .copy-btn {
      font-size: 0;
    }

  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container">
      <a class="navbar-brand" href="#">Linux 更新源代理服务 (智能架构检测版)</a>
    </div>
  </nav>

  <div class="container mt-4">
    <h1 class="mb-3">Linux 系统更新源代理</h1>
    <p class="lead">基于 Cloudflare Workers 的 Linux 发行版更新源反向代理服务，<strong>可自动识别不同架构</strong>，加速软件包下载和系统更新。</p>

    <div class="alert alert-success mt-3">
      <h4>💡 新版本：智能架构识别</h4>
      <p>本服务现在可以智能识别系统架构，自动适配正确的更新源，不再需要手动选择架构特定的镜像。</p>
      <ul class="mb-0">
        <li>对于 Ubuntu：同时支持 x86/x64 和 ARM64 架构，会自动选择正确的源</li>
        <li>对于 Debian：同时支持 x86/x64、ARM 和 RISC-V 架构，会自动选择正确的源</li>
        <li>其他发行版也将逐步支持架构智能识别</li>
      </ul>
    </div>

    <div class="alert alert-info mt-3">
      <h4>为什么使用代理？</h4>
      <ul class="mb-0">
        <li>加速软件包下载</li>
        <li>解决网络访问限制问题</li>
        <li>提高系统更新稳定性</li>
      </ul>
    </div>

    <div class="alert alert-warning">
      <h4>注意事项</h4>
      <p class="mb-0">此代理服务仅用于学习和测试目的，不保证永久可用性和完整性。所有配置命令都会先自动备份原始配置文件，以便在需要时恢复。</p>
    </div>

    <h2 class="mt-4">支持的 Linux 发行版</h2>
    <div class="row row-cols-1 row-cols-md-3 g-3 mb-4">
      <div class="col"><div class="card h-100">
        <div class="card-header">Ubuntu（通用配置）</div>
        <div class="card-body">
          <p class="card-text"><strong>新功能：</strong>统一配置方式，自动识别 x86/x64 或 ARM64 架构。</p>
          <a href="#ubuntu" class="btn btn-sm btn-primary">配置方法</a>
        </div>
      </div></div>
      <div class="col"><div class="card h-100">
        <div class="card-header">Debian（通用配置）</div>
        <div class="card-body">
          <p class="card-text"><strong>新功能：</strong>统一配置方式，自动识别 x86/x64、ARM 或 RISC-V 架构。</p>
          <a href="#debian" class="btn btn-sm btn-primary">配置方法</a>
        </div>
      </div></div>
      <div class="col"><div class="card h-100">
        <div class="card-header">CentOS/RHEL</div>
        <div class="card-body">
          <p class="card-text">支持 CentOS 和 RHEL 系列的软件源代理。</p>
          <a href="#centos" class="btn btn-sm btn-primary">配置方法</a>
        </div>
      </div></div>
    </div>

    <div class="accordion mb-4">
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading1">
          <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse1" aria-expanded="true" aria-controls="collapse1">
            其他支持的系统
          </button>
        </h2>
        <div id="collapse1" class="accordion-collapse collapse" aria-labelledby="heading1">
          <div class="accordion-body">
            <div class="row row-cols-1 row-cols-md-3 g-3">
              <div class="col"><div class="card h-100">
                <div class="card-header">Fedora</div>
                <div class="card-body">
                  <a href="#fedora" class="btn btn-sm btn-primary">配置方法</a>
                </div>
              </div></div>
              <div class="col"><div class="card h-100">
                <div class="card-header">Arch Linux</div>
                <div class="card-body">
                  <a href="#archlinux" class="btn btn-sm btn-primary">配置方法</a>
                </div>
              </div></div>
              <div class="col"><div class="card h-100">
                <div class="card-header">Alpine</div>
                <div class="card-body">
                  <a href="#alpine" class="btn btn-sm btn-primary">配置方法</a>
                </div>
              </div></div>
              <div class="col"><div class="card h-100">
                <div class="card-header">Raspbian <span class="badge badge-arm">ARM</span></div>
                <div class="card-body">
                  <a href="#raspbian" class="btn btn-sm btn-primary">配置方法</a>
                </div>
              </div></div>
              <div class="col"><div class="card h-100">
                <div class="card-header">Armbian <span class="badge badge-arm">ARM</span></div>
                <div class="card-body">
                  <a href="#armbian" class="btn btn-sm btn-primary">配置方法</a>
                </div>
              </div></div>
              <div class="col"><div class="card h-100">
                <div class="card-header">Arch Linux ARM <span class="badge badge-arm">ARM</span></div>
                <div class="card-body">
                  <a href="#archlinux-arm" class="btn btn-sm btn-primary">配置方法</a>
                </div>
              </div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h2 class="mt-4" id="ubuntu">Ubuntu 配置方法（自动识别架构）</h2>
    <p>适用于所有 Ubuntu 版本，<strong>自动识别 x86/x64 或 ARM64 架构</strong>：</p>
    <pre id="ubuntu-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/apt/sources.list /etc/apt/sources.list.bak.$TIMESTAMP && if grep -q "ubuntu-ports" /etc/apt/sources.list; then
  # ARM64 版本的 Ubuntu
  sed -i "s|http://ports.ubuntu.com/ubuntu-ports/|${currentDomain}/ubuntu-arm/|g" /etc/apt/sources.list
  sed -i "s|http://ports.ubuntu.com/ubuntu-ports|${currentDomain}/ubuntu-arm|g" /etc/apt/sources.list
  sed -i "s|http://.*\\.clouds\\.ports\\.ubuntu\\.com/ubuntu-ports/|${currentDomain}/ubuntu-arm/|g" /etc/apt/sources.list
else
  # 标准 x86/x64 版本的 Ubuntu
  sed -i "s|http://archive.ubuntu.com/ubuntu/|${currentDomain}/ubuntu/|g" /etc/apt/sources.list
  sed -i "s|http://security.ubuntu.com/ubuntu/|${currentDomain}/ubuntu/|g" /etc/apt/sources.list
  sed -i "s|http://.*\\.archive\\.ubuntu\\.com/ubuntu/|${currentDomain}/ubuntu/|g" /etc/apt/sources.list
fi && apt update && echo "已备份原配置至 /etc/apt/sources.list.bak.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('ubuntu-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="debian">Debian 配置方法（自动识别架构）</h2>
    <p>适用于所有 Debian 版本，<strong>自动识别 x86/x64、ARM 或 RISC-V 架构</strong>：</p>
    <pre id="debian-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/apt/sources.list /etc/apt/sources.list.bak.$TIMESTAMP && if grep -q "debian-ports" /etc/apt/sources.list; then
  # ARM 或 RISC-V 版本的 Debian
  sed -i "s|http://deb.debian.org/debian-ports|${currentDomain}/debian-ports|g" /etc/apt/sources.list
else
  # 标准 x86/x64 版本的 Debian
  sed -i "s|http://deb.debian.org/debian|${currentDomain}/debian|g" /etc/apt/sources.list
  sed -i "s|http://security.debian.org/debian-security|${currentDomain}/debian-security|g" /etc/apt/sources.list
fi && apt update && echo "已备份原配置至 /etc/apt/sources.list.bak.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('debian-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="centos">CentOS/RHEL 配置方法</h2>
    <pre id="centos-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && mkdir -p /etc/yum.repos.d/backup.$TIMESTAMP && cp /etc/yum.repos.d/CentOS-*.repo /etc/yum.repos.d/backup.$TIMESTAMP/ && sed -i "s|^mirrorlist=|#mirrorlist=|g" /etc/yum.repos.d/CentOS-*.repo && sed -i "s|^#baseurl=http://mirror.centos.org/centos|baseurl=${currentDomain}/centos|g" /etc/yum.repos.d/CentOS-*.repo && yum clean all && yum makecache && echo "已备份原配置至 /etc/yum.repos.d/backup.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('centos-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="fedora">Fedora 配置方法</h2>
    <pre id="fedora-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && mkdir -p /etc/yum.repos.d/backup.$TIMESTAMP && cp /etc/yum.repos.d/fedora*.repo /etc/yum.repos.d/backup.$TIMESTAMP/ && sed -i "s|^metalink=|#metalink=|g" /etc/yum.repos.d/fedora*.repo && sed -i "s|^#baseurl=https://mirrors.fedoraproject.org|baseurl=${currentDomain}/fedora|g" /etc/yum.repos.d/fedora*.repo && dnf clean all && dnf makecache && echo "已备份原配置至 /etc/yum.repos.d/backup.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('fedora-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="archlinux">Arch Linux 配置方法</h2>
    <pre id="archlinux-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/pacman.d/mirrorlist /etc/pacman.d/mirrorlist.bak.$TIMESTAMP && echo "Server = ${currentDomain}/archlinux/\\$repo/os/\\$arch" > /etc/pacman.d/mirrorlist && pacman -Syy && echo "已备份原配置至 /etc/pacman.d/mirrorlist.bak.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('archlinux-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="alpine">Alpine 配置方法</h2>
    <pre id="alpine-config">bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/apk/repositories /etc/apk/repositories.bak.$TIMESTAMP &&
    ALPINE_VERSION=$(cat /etc/os-release | grep VERSION_ID | cut -d= -f2 | cut -d. -f1,2) &&
    echo "${currentDomain}/alpine/v$ALPINE_VERSION/main" > /etc/apk/repositories &&
    echo "${currentDomain}/alpine/v$ALPINE_VERSION/community" >> /etc/apk/repositories &&
    apk update &&
    echo "已备份原配置至 /etc/apk/repositories.bak.$TIMESTAMP 并更新完成！使用版本: v$ALPINE_VERSION"'
<button class="copy-btn" onclick="copyToClipboard('alpine-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="raspbian">Raspbian 配置方法 <span class="badge badge-arm">ARM</span></h2>
    <pre id="raspbian-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/apt/sources.list /etc/apt/sources.list.bak.$TIMESTAMP && sed -i "s|http://archive.raspbian.org/raspbian|${currentDomain}/raspbian|g" /etc/apt/sources.list && apt update && echo "已备份原配置至 /etc/apt/sources.list.bak.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('raspbian-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="armbian">Armbian 配置方法 <span class="badge badge-arm">ARM</span></h2>
    <pre id="armbian-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/apt/sources.list.d/armbian.list /etc/apt/sources.list.d/armbian.list.bak.$TIMESTAMP && sed -i "s|https://apt.armbian.com|${currentDomain}/armbian|g" /etc/apt/sources.list.d/armbian.list && apt update && echo "已备份原配置至 /etc/apt/sources.list.d/armbian.list.bak.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('armbian-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <h2 class="mt-3" id="archlinux-arm">Arch Linux ARM 配置方法 <span class="badge badge-arm">ARM</span></h2>
    <pre id="archlinux-arm-config">sudo bash -c 'TIMESTAMP=$(date +%Y%m%d_%H%M%S) && cp /etc/pacman.d/mirrorlist /etc/pacman.d/mirrorlist.bak.$TIMESTAMP && echo "Server = ${currentDomain}/archlinux-arm/\\$arch/\\$repo" > /etc/pacman.d/mirrorlist && pacman -Syy && echo "已备份原配置至 /etc/pacman.d/mirrorlist.bak.$TIMESTAMP 并更新完成！"'
<button class="copy-btn" onclick="copyToClipboard('archlinux-arm-config')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
  copy
</button></pre>

    <div class="alert alert-info mt-5">
      <h4>报告问题或获取帮助</h4>
      <p>如果您在使用过程中遇到任何问题，或者发现某些特定架构下的发行版无法正常工作，请通过以下方式联系我们：</p>
      <ul>
        <li>在 GitHub 上提交 Issue: <a href="https://github.com/yourusername/linux-mirror-proxy/issues">github.com/yourusername/linux-mirror-proxy</a></li>
        <li>通过电子邮件联系: support@example.com</li>
      </ul>
      <p class="mb-0">我们将持续改进此服务，以支持更多的架构和发行版。</p>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
  function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);

    // 获取 pre 元素中的文本，但排除按钮内容
    const button = element.querySelector('.copy-btn');
    const buttonClone = button.cloneNode(true);

    // 暂时移除按钮以获取纯命令文本
    button.remove();
    const text = element.textContent.trim();

    // 将按钮放回原处
    element.appendChild(buttonClone);

    navigator.clipboard.writeText(text).then(function() {
      const newButton = element.querySelector('.copy-btn');
      const originalText = newButton.innerHTML;

      // 变更按钮文字，显示复制成功
      newButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ok!';
      newButton.style.backgroundColor = '#d4edda';
      newButton.style.borderColor = '#c3e6cb';
      newButton.style.color = '#155724';

      // 3秒后恢复原始状态
      setTimeout(function() {
        newButton.innerHTML = originalText;
        newButton.style.backgroundColor = '';
        newButton.style.borderColor = '';
        newButton.style.color = '';
      }, 3000);
    }).catch(function(err) {
      console.error('无法复制文字: ', err);
    });
  }
  </script>
</body>
</html>`;

  // 动态替换域名
  const finalHTML = html.replace(/\${currentDomain}/g, currentDomain);

  return new Response(finalHTML, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
    },
  });
}
