import json, urllib.request

BASE = "https://dbujdjixdevkvxigijch.supabase.co/functions/v1/quickstart-functions"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWpkaml4ZGV2a3Z4aWdpamNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODEyMDEsImV4cCI6MjA5OTk1NzIwMX0.RJAGySCX5SKCWefVZzLls6xQrDSDfinX-M1hUOfxCG4"

def call(payload):
    req = urllib.request.Request(
        BASE,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

ok = True
def check(name, cond, detail=""):
    global ok
    print(("PASS" if cond else "FAIL"), name, detail)
    if not cond: ok = False

# ---- user_data 链路(对应 onLoad / loadFromLocalAndUpload / syncCloudData)----
r = call({"type": "getUserData"})
check("getUserData 初始为空", r.get("data") == [], r)

cfg = {
    "unit": "jin", "fontScale": 1.2, "voiceEnabled": False,
    "categories": [{"id": 1, "name": "黄纸板", "price": 1.2}],
    "customerCounter": 5,
    "customers": [{"id": 1, "name": "顾客 1", "invoice": [], "inputFormula": "", "formulas": {}, "lastClearedFormulas": {}}],
}
r = call({"type": "createUserData", "data": cfg})
doc_id = r.get("_id")
check("createUserData 返回 _id", bool(doc_id), r)

r = call({"type": "getUserData"})
row = (r.get("data") or [{}])[0]
check("getUserData 字段映射回 camelCase",
      row.get("_id") == doc_id and row.get("fontScale") == 1.2
      and row.get("voiceEnabled") == False and row.get("customerCounter") == 5
      and row.get("categories", [{}])[0].get("name") == "黄纸板",
      json.dumps(row, ensure_ascii=False))

r = call({"type": "updateUserData", "data": {"_id": doc_id, "data": {"unit": "kg", "customerCounter": 6}}})
check("updateUserData 成功", r.get("success") == True, r)
row = (call({"type": "getUserData"}).get("data") or [{}])[0]
check("updateUserData 生效", row.get("unit") == "kg" and row.get("customerCounter") == 6 and row.get("fontScale") == 1.2,
      json.dumps(row, ensure_ascii=False))

# ---- history_bills 链路(对应 settleInvoice / loadCloudHistory / undoHistory)----
bill = {"id": 1784395400000, "time": 1784395400000, "total": 15.75,
        "items": [{"catName": "黄纸板", "weight": 12.5, "unit": "jin", "total": 15.0}]}
r = call({"type": "addHistoryBill", "data": bill})
check("addHistoryBill 成功", r.get("success") == True, r)

r = call({"type": "getHistoryBills"})
bills = r.get("data") or []
hit = [b for b in bills if b.get("id") == bill["id"]]
check("getHistoryBills 返回且 id 还原", len(hit) == 1 and hit[0].get("total") == 15.75
      and hit[0].get("items", [{}])[0].get("catName") == "黄纸板",
      json.dumps(hit, ensure_ascii=False))

r = call({"type": "deleteHistoryBill", "data": {"id": bill["id"]}})
check("deleteHistoryBill 成功", r.get("success") == True, r)
bills = call({"type": "getHistoryBills"}).get("data") or []
check("删除后不再返回", all(b.get("id") != bill["id"] for b in bills), f"剩余 {len(bills)} 条")

# ---- sales 原有动作回归 ----
r = call({"type": "selectRecord"})
check("selectRecord 回归(4条种子)", len(r.get("data") or []) == 4)

print()
print("全部通过" if ok else "存在失败项")
