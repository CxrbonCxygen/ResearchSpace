# ResearchSpace · 个人科研空间

科研项目、训练可视化、知识卡片与每日推进，配套可离线使用的 Android APP。

- [网站](https://researchspace-chenxin.cxrboncxygen.chatgpt.site/)
- [Android 1.0.2 下载](https://github.com/CxrbonCxygen/ResearchSpace/releases/tag/v1.0.2)

## 使用

下载 Release 中的 APK，在 Android 8.0 或更高版本安装。已安装 1.0.1 的用户直接覆盖升级，保留本机记录；无需卸载。使用自己的独立账号登录云端，科研工作台中打开项目，再点击“查看训练曲线”。联网打开过的曲线和评测会缓存，离线可查看缓存时间与历史；APP 关闭后不进行后台同步。

公开源码和下载页不包含账号或科研记录。网站现有实例使用所有者账号保护数据；如需自己的空间，请独立部署并创建自己的账号和数据库。

## 源码

| 目录 | 内容 |
| --- | --- |
| `web/` | React/Vinext 网站、Cloudflare D1 API、移动端共享界面、离线同步和测试 |
| `android/` | 原生 WebView 容器、Android Keystore、网络桥接与签名构建脚本 |

Node.js >= 22.13。网站开发与测试：

```sh
cd web
npm ci
npm test
npx tsc --noEmit
npm run dev
npm run build
```

安卓先在 `web/` 运行：

```sh
node node_modules/vite/bin/vite.js build --config mobile/vite.config.ts
```

再于 Windows PowerShell 在 `android/` 运行 `./build.ps1`。构建需要 JDK 17、Android 35 平台与 build-tools 35，目录布局见 Android README；为自己的发行生成独立签名。官方发行的签名私钥由所有者本机保存，未包含在仓库中。

网站部署需配置自己的站点和 D1，并应用 `web/drizzle/` 下的迁移。当前代码面向 Sites/Cloudflare Workers 运行环境，普通静态托管不提供云端数据 API。自行部署时应先完成所有者账号初始化，再开放入口。

## 实验记录

逐步日志通过限定实验的写入令牌导入，网页与 APP 展示同一数据源。默认示例数据仅供界面体验。不同生成长度分开比较；缺少完整评测时不推断准确率。电脑转发采集依赖电脑及连接保持在线。部署数据、SSH 凭据、同步令牌、APK 签名私钥、环境文件、日志与缓存均未包含在公开源码。

## 验证范围

当前版本通过类型检查、35 项自动检查、离线前端构建、安卓编译与 v2/v3 签名校验。原生安装包保持包名和签名连续，版本码递增。自动检查覆盖离线曲线缓存、重新连接、状态合并和历史记录；仍需在实际手机上确认厂商 WebView 与安装行为。
