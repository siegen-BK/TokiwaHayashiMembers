window.APP_CONFIG = {
  YEAR_LABEL: "令和7年",
  APP_TITLE: "常磐連 囃子メンバー表",
  REMOTE_CONFIG_URL: "", // 共有JSONを使う場合 ここにURL（空なら無視）
  COVER: {
    title: "令和7年 常磐連 囃子メンバー表",
    image: "icons/icon-512.png",
    caption: "（表紙画像は後で差し替え可能）"
  },
  DAYS: [
    { id:"2025-11-03", label:"11/3(月･祝)" },
    { id:"2025-11-04", label:"11/4(火)" },
    { id:"2025-11-05", label:"11/5(水)" }
  ],
  SOURCES: {
    members: "data/members.sample.json",
    attendance: "data/attendance.sample.json",
    assign: {
      "2025-11-03": "data/assign_2025-11-03.sample.json",
      "2025-11-04": "data/assign_2025-11-04.sample.json",
      "2025-11-05": "data/assign_2025-11-05.sample.json"
    },
    route: {
      "2025-11-03": "data/route_2025-11-03.sample.json",
      "2025-11-04": "data/route_2025-11-04.sample.json",
      "2025-11-05": "data/route_2025-11-05.sample.json"
    },
    notes: {
      "2025-11-03": "data/notes_2025-11-03.sample.json",
      "2025-11-04": "data/notes_2025-11-04.sample.json",
      "2025-11-05": "data/notes_2025-11-05.sample.json"
    }
  },
  EXCERPTS: [
    { id:"only-daidou", label:"大胴だけ", type:"assign", field:"part", op:"eq", value:"大胴" },
    { id:"only-fue", label:"笛だけ", type:"assign", field:"part", op:"eq", value:"笛" }
  ],
  HEADERS: {
    members: { member_id:"member_id", name:"name", group:"group", role:"role", status:"status" },
    attendance: { member_id:"member_id", event_date:"event_date", attendance:"attendance" }
  }
};
