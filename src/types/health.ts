export interface HealthTag {
  name: string;      // 标签名，如 "胃寒"
  source: string;    // 来源，如 "user_manual" 或 "ai_inferred"
  added_at: string;  // 添加时间 ISO 字符串
}

export interface UserHealthProfile {
  active: HealthTag[]; // 当前生效的标签
  history: any[];      // 历史归档（前端暂时只读不展示）
}