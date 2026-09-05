// app.js
const cloud = require("./utils/supabase.js");

App({
  onLaunch: function () {
    // 已从微信云开发迁移到 Supabase,云端访问统一走 utils/supabase.js
    if (!cloud.enabled) {
      console.error(
        "请先在 miniprogram/utils/supabase.js 中填写 Supabase URL 与 anon key"
      );
    }
  },
});
