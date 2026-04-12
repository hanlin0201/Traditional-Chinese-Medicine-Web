// Supabase Edge Function - TCM Chat Proxy
// 运行环境：Deno（Supabase Edge Runtime）
// 作用：代理前端请求到硅基流动 API，API Key 安全存储在服务端环境变量中
// 调用链路：前端（AiCompanion.vue） -> Supabase Edge Function（本文件） -> 硅基流动 SiliconFlow API

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // 处理预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("SILICONFLOW_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SILICONFLOW_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const {
      messages,
      systemPrompt,
      userTurnCount,
      userJustConfirmed,
      conversationResetAfterPrescription,
      isGeneralQuestion,
      userSaysAllFine,
      userNeedsPlanCard,
      isVagueSymptom,
    } = await req.json();

    // 构建发送给硅基流动的消息列表
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // 在最后一条 user 消息末尾追加系统提示
    const lastUserIdx = apiMessages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx !== -1) {
      let hint = "";
      // 💡 提取出开方卡片的严格格式要求，防止代码重复，也防止 AI 忘掉格式
      const FORMAT_PROMPT =
        '【重要】必须先用2-3句自然语言写出诊断分析（如"根据你的症状和舌苔情况，初步判断你属于……"），再紧接着输出处方 JSON 卡片。禁止直接输出 JSON 而不写诊断分析。JSON格式：必须包含 ```json 代码块，内容为 {"type":"prescription","warm_words":"...","diagnosis_result":"...","summary":"...","recipes":[{"category":"tea",...},{"category":"meal",...},{"category":"classic",...}],"acupoints":[{"name":"...","location":"...","method":"..."} 或 {"name":"无","location":"无","method":"无"}],"lifestyle":["..."]}。recipes 必须有 tea、meal、classic 三类。严禁只输出纯文字不输出 JSON。';
      const SAFETY_PROMPT =
        "【食疗红线】仅推荐食疗食谱，禁止成药（丸、散、可直接购买服用）。严禁附子、乌头、马钱子等有毒药材。";
      const INQUIRY_PROMPT =
        '回复末尾必须附带如下格式的 JSON 选项卡片（禁止省略）：\n```json\n{"type":"inquiry","text":"你这一轮的问诊问题","options":[{"label":"选项1","value":"v1"},{"label":"以上都不是","value":"none"},{"label":"无其他症状，请开方","value":"finish"}]}\n```';

      if (userSaysAllFine) {
        hint = "用户表示一切良好，请停止追问，简短祝福即可。严禁输出 JSON。";
      } else if (isGeneralQuestion) {
        hint = "用户在问知识类问题，请直接回答，不要追问症状。严禁输出 JSON。";
      } else if (userJustConfirmed) {
        hint = `用户已确认没有其他症状或要求直接开方，请立即结束问诊，输出详细的处方 JSON 卡片（type: "prescription"）。\n${SAFETY_PROMPT}\n格式要求：${FORMAT_PROMPT}`;
      } else {
        const needMoreRounds = isVagueSymptom
          ? userTurnCount < 5
          : userTurnCount < 4;
        if (needMoreRounds) {
          // 判断对话中是否已经问过舌苔
          const tongueAsked = messages.some(
            (m: { role: string; content: string }) =>
              m.role === "assistant" && (m.content || "").includes("舌苔"),
          );
          const tongueHint = tongueAsked
            ? "（舌苔已询问过，本轮请从其他角度追问，不要重复已问过的问题）"
            : "【本轮必须询问舌苔情况】（舌色是红/淡/暗？苔是白/黄/厚/薄/腻？）";

          if (isVagueSymptom) {
            hint = `【重要】用户描述较模糊，必须多维度追问，当前仅第 ${userTurnCount} 轮，【绝对不要】急于开方！${tongueHint}\n${INQUIRY_PROMPT}`;
          } else if (userNeedsPlanCard) {
            hint = `【重要】用户想要调理方案，但当前第 ${userTurnCount} 轮信息尚不充分，【绝对不要】输出 prescription！${tongueHint}\n${INQUIRY_PROMPT}`;
          } else {
            hint = `【重要】当前问诊第 ${userTurnCount} 轮，除非用户明确说"直接开方"，否则【绝对不要】输出 prescription！${tongueHint}\n${INQUIRY_PROMPT}`;
          }
        } else {
          if (userNeedsPlanCard) {
            hint = `【进度提示】问诊已进行 ${userTurnCount} 轮，用户明确请求方案，请立即输出处方。\n${SAFETY_PROMPT}\n格式要求：${FORMAT_PROMPT}`;
          } else {
            hint = `【进度提示】问诊已进行 ${userTurnCount} 轮。如果核心症状、舌象等信息已足够，请直接输出处方；否则继续追问。\n${SAFETY_PROMPT}\n格式要求：${FORMAT_PROMPT}\n如继续追问：${INQUIRY_PROMPT}`;
          }
        }
      }

      //  如果是有过历史处方的复诊，提醒 AI 可参考历史上下文（而非忘掉）
      if (conversationResetAfterPrescription) {
        hint =
          "【复诊提醒】本对话有过往处方记录。若用户提及上次调理情况或症状变化，请结合历史信息综合判断，无需重复追问已了解的内容。若用户提出全新问题，则重新独立辨证分析。\n" +
          hint;
      }
      apiMessages[lastUserIdx] = {
        ...apiMessages[lastUserIdx],
        content: `${apiMessages[lastUserIdx].content}\n【系统提示：用户已进行了 ${userTurnCount} 轮对话。${hint}】`,
      };
    }

    const upstream = await fetch(
      "https://api.siliconflow.cn/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-72B-Instruct",
          messages: apiMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      },
    );

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "Unknown error");
      return new Response(
        JSON.stringify({
          error: `Upstream error(${upstream.status}): ${errorText}`,
        }),
        {
          status: upstream.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // 直接将硅基流动的 SSE 流透传给前端
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
