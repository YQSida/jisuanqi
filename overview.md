# 摊友称重计价助手 - 优化与功能更新概览

## 1. 纯离线零延迟语音引擎与触感反馈（已完成）
- **核心问题解决**：原方案每次按键都向外网 `dict.youdao.com` 发送网络请求，在户外弱网环境下按键有 0.5~1 秒严重卡顿滞后，且易触发正式版域名白名单限制。
- **本地化重构**：
  - 生成 27 个轻量 MP3 音频文件至 `miniprogram/audio/`（0~9、加减点、清空退格、加入清单、金额词缀），总包体仅增 180KB 左右。
  - 新建 `miniprogram/utils/voiceManager.js` 单例引擎，按键单发切断防粘连，0 网络请求，0 毫秒延迟。
  - 支持结算金额离线拼读（例：`125.50` 依次拼读：`总共收废品` -> `一百二十五元` -> `五角`）。
  - 按键同步伴随 `wx.vibrateShort({ type: 'light' })` 物理轻震动，即使静音也能获得利落实体触感。
  - 页面 `onHide` / `onUnload` 自动止音释放，避免后台串音。

## 2. 图形化「电子回收小票」长图生成（已完成）
- **Canvas 2D 高清自适应绘图 (`miniprogram/utils/receiptDrawer.js`)**：
  - 包含店名、单号、交易时间、电话、四列品类明细表格、大写金额转换、防伪印章、二维码引流及仿纸质锯齿边缘。
  - 历史账本卡片与结算弹窗一键调用，支持微信原生长按直接分享图片、保存相册和全屏放大预览。

## 3. 涉及文件变更清单
- 新增：`miniprogram/utils/voiceManager.js`
- 新增：`miniprogram/utils/receiptDrawer.js`
- 新增：`miniprogram/audio/`（共 27 个按键与金额本地音频）
- 修改：`miniprogram/pages/index/index.js`
- 修改：`miniprogram/pages/index/index.wxml`
- 修改：`miniprogram/pages/index/index.wxss`
