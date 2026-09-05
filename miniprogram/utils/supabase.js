// miniprogram/utils/supabase.js
// 微信云开发 → Supabase 迁移:云端访问封装
// 用法与原 wx.cloud 保持一致:
//   const cloud = require('../../utils/supabase.js');
//   cloud.database().collection('user_data').get().then(...)
//   cloud.callFunction({ name: 'quickstartFunctions', data: { type: 'selectRecord' } })
// 数据不再直连数据库,而是统一经 Supabase Edge Function(service role)访问。

const SUPABASE_URL = "https://dbujdjixdevkvxigijch.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWpkaml4ZGV2a3Z4aWdpamNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODEyMDEsImV4cCI6MjA5OTk1NzIwMX0.RJAGySCX5SKCWefVZzLls6xQrDSDfinX-M1hUOfxCG4";
const FUNCTION_NAME = "quickstart-functions";

// 配置是否就绪(替代原来的 wx.cloud 存在性判断)
const enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// 调用 Edge Function,返回结构与 wx.cloud.callFunction 一致:{ result: ... }
function callFunction(options) {
  const data = (options && options.data) || {};
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`,
      method: "POST",
      header: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ result: res.data });
        } else {
          reject(
            new Error(
              `Edge Function HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`
            )
          );
        }
      },
      fail: (err) => reject(err),
    });
  });
}

// 集合名 → Edge Function action 映射
const ACTIONS = {
  user_data: {
    get: "getUserData",
    add: "createUserData",
    update: "updateUserData",
  },
  history_bills: {
    get: "getHistoryBills",
    add: "addHistoryBill",
    remove: "deleteHistoryBill",
  },
};

// 最小化的 wx.cloud.database() 兼容层,只覆盖本项目用到的调用链
function database() {
  return {
    collection(name) {
      const acts = ACTIONS[name] || {};
      let whereCond = null;

      const api = {
        // collection('xxx').get()
        get() {
          return callFunction({ data: { type: acts.get } }).then((r) => ({
            data: r.result.data || [],
          }));
        },
        // collection('xxx').add({ data })
        add(options) {
          return callFunction({
            data: { type: acts.add, data: options.data },
          }).then((r) => ({ _id: r.result._id }));
        },
        // collection('xxx').doc(id).update({ data })
        doc(id) {
          return {
            update(options) {
              return callFunction({
                data: { type: acts.update, data: { _id: id, data: options.data } },
              }).then((r) => r.result);
            },
          };
        },
        // 链式调用仅为兼容原写法,排序与限量由服务端固定执行
        orderBy() {
          return api;
        },
        limit() {
          return api;
        },
        where(cond) {
          whereCond = cond;
          return api;
        },
        // collection('history_bills').where({ id }).remove()
        remove() {
          return callFunction({
            data: { type: acts.remove, data: { id: whereCond && whereCond.id } },
          }).then((r) => r.result);
        },
      };
      return api;
    },
  };
}

module.exports = {
  enabled,
  callFunction,
  database,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
};
