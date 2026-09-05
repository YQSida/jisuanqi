import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// service role:绕过 RLS,与原微信云函数的管理员权限模型一致
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// sales 行 → 微信风格返回(_id 为主键字符串),保持与原云函数协议一致
function toWx(row: Record<string, unknown>) {
  const { id, ...rest } = row;
  return { _id: id, ...rest };
}

// ---------- sales CRUD(对应原微信云函数各 action) ----------

// 原 createCollection:表结构已由迁移创建,这里做幂等种子数据
async function createCollection() {
  const seed = [
    { region: "华东", city: "上海", sales: 11 },
    { region: "华东", city: "南京", sales: 11 },
    { region: "华南", city: "广州", sales: 22 },
    { region: "华南", city: "深圳", sales: 22 },
  ];
  const { error } = await supabase
    .from("sales")
    .upsert(seed, { onConflict: "region,city", ignoreDuplicates: true });
  if (error) throw error;
  return { success: true, data: "create collection success" };
}

async function selectRecord() {
  const { data, error } = await supabase.from("sales").select("*");
  if (error) throw error;
  return { data: (data ?? []).map(toWx) };
}

async function updateRecord(event: { data?: Array<{ _id: string; sales: number }> }) {
  try {
    for (const item of event.data ?? []) {
      const { error } = await supabase
        .from("sales")
        .update({ sales: item.sales })
        .eq("id", item._id);
      if (error) throw error;
    }
    return { success: true, data: event.data };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

async function insertRecord(event: { data?: { region: string; city: string; sales: unknown } }) {
  try {
    const r = event.data ?? ({} as { region: string; city: string; sales: unknown });
    const { error } = await supabase.from("sales").insert({
      region: r.region,
      city: r.city,
      sales: Number(r.sales),
    });
    if (error) throw error;
    return { success: true, data: event.data };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

async function deleteRecord(event: { data?: { _id: string } }) {
  try {
    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", event.data?._id ?? "");
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

// ---------- user_data(小程序配置,对应原客户端直连数据库) ----------

// DB 行(snake_case) → 小程序端格式(camelCase + _id)
function userDataToWx(row: Record<string, unknown>) {
  const { id, font_scale, voice_enabled, customer_counter, ...rest } = row;
  return {
    _id: id,
    fontScale: font_scale,
    voiceEnabled: voice_enabled,
    customerCounter: customer_counter,
    ...rest,
  };
}

// 小程序端字段 → DB 列
function userDataToDb(d: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {
    openid: d.openid,
    unit: d.unit,
    font_scale: d.fontScale,
    voice_enabled: d.voiceEnabled,
    categories: d.categories,
    customer_counter: d.customerCounter,
    customers: d.customers,
  };
  // undefined 不写入,让列默认值生效
  return Object.fromEntries(Object.entries(mapped).filter(([, v]) => v !== undefined));
}

// 原 db.collection('user_data').get()
async function getUserData(event: { openid?: string }) {
  let query = supabase.from("user_data").select("*").order("created_at", { ascending: true });
  if (event?.openid) query = query.eq("openid", event.openid);
  const { data, error } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(userDataToWx) };
}

// 原 db.collection('user_data').add({ data })
async function createUserData(event: { data?: Record<string, unknown> }) {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .insert(userDataToDb(event.data ?? {}))
      .select("id")
      .single();
    if (error) throw error;
    return { _id: data.id };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

// 原 db.collection('user_data').doc(id).update({ data })
async function updateUserData(event: { data?: { _id?: string; data?: Record<string, unknown> } }) {
  try {
    const payload = event.data ?? {};
    const clean = {
      ...userDataToDb(payload.data ?? {}),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("user_data").update(clean).eq("id", payload._id ?? "");
    if (error) throw error;
    return { success: true, data: payload.data };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

// ---------- history_bills(结算历史) ----------

// DB 行 → 小程序端格式:bill_id 还原为业务字段 id
function billToWx(row: Record<string, unknown>) {
  const { id, bill_id, ...rest } = row;
  return { _id: id, id: bill_id, ...rest };
}

// 原 db.collection('history_bills').orderBy('time','desc').limit(100).get()
async function getHistoryBills(event: { openid?: string }) {
  let query = supabase
    .from("history_bills")
    .select("*")
    .order("time", { ascending: false })
    .limit(100);
  if (event?.openid) query = query.eq("openid", event.openid);
  const { data, error } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(billToWx) };
}

// 原 db.collection('history_bills').add({ data: record })
async function addHistoryBill(event: { data?: Record<string, unknown> }) {
  try {
    const d = event.data ?? {};
    const { error } = await supabase.from("history_bills").insert({
      bill_id: d.id,
      openid: d.openid ?? null,
      time: d.time,
      total: d.total,
      items: d.items ?? [],
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

// 原 db.collection('history_bills').where({ id }).remove()
async function deleteHistoryBill(event: { data?: { id?: number } }) {
  try {
    const { error } = await supabase
      .from("history_bills")
      .delete()
      .eq("bill_id", event.data?.id ?? 0);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

// ---------- 微信特有能力(无法 1:1 迁移,给出等价实现路径) ----------

// 原 getOpenId 依赖微信登录态(cloud.getWXContext)。
// 等价方案:小程序端 wx.login() 拿 code,这里用 code2session 换 openid,
// 需要配置 WECHAT_APPID / WECHAT_SECRET 环境变量。
async function getOpenId(event: { code?: string }) {
  const appid = Deno.env.get("WECHAT_APPID");
  const secret = Deno.env.get("WECHAT_SECRET");
  if (!appid || !secret || !event?.code) {
    return {
      success: false,
      errMsg:
        "getOpenId 依赖微信登录态:请传 {type:'getOpenId', code:<wx.login 的 code>},并配置 WECHAT_APPID / WECHAT_SECRET 环境变量",
    };
  }
  const resp = await fetch(
    `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${event.code}&grant_type=authorization_code`
  );
  const json = await resp.json();
  if (json.errcode) return { success: false, errMsg: json.errmsg };
  return { openid: json.openid, unionid: json.unionid ?? null, appid };
}

// 原 getMiniProgramCode 依赖微信 openapi(wxacode.get)+ 微信云存储,
// 需要 access_token 与存储方案,标记为待实现。
function getMiniProgramCode() {
  return {
    success: false,
    errMsg:
      "getMiniProgramCode 依赖微信 openapi(wxacode.get)与云存储:需用 WECHAT_APPID/WECHAT_SECRET 换 access_token 后另行实现,并改用 Supabase Storage 存图",
  };
}

// ---------- 入口:保持与原云函数相同的 { type, data } 协议 ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const event = await req.json();
    let result: unknown;
    switch (event.type) {
      case "getOpenId":
        result = await getOpenId(event);
        break;
      case "getMiniProgramCode":
        result = getMiniProgramCode();
        break;
      case "createCollection":
        result = await createCollection();
        break;
      case "selectRecord":
        result = await selectRecord();
        break;
      case "updateRecord":
        result = await updateRecord(event);
        break;
      case "insertRecord":
        result = await insertRecord(event);
        break;
      case "deleteRecord":
        result = await deleteRecord(event);
        break;
      case "getUserData":
        result = await getUserData(event);
        break;
      case "createUserData":
        result = await createUserData(event);
        break;
      case "updateUserData":
        result = await updateUserData(event);
        break;
      case "getHistoryBills":
        result = await getHistoryBills(event);
        break;
      case "addHistoryBill":
        result = await addHistoryBill(event);
        break;
      case "deleteHistoryBill":
        result = await deleteHistoryBill(event);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, errMsg: `unknown type: ${event.type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, errMsg: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
