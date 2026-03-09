// Supabase Edge Function - TCM Chat Proxy
// 运行环境：Deno（Supabase Edge Runtime）
// 作用：代理前端请求到硅基流动 API，API Key 安全存储在服务端环境变量中

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const apiKey = Deno.env.get('SILICONFLOW_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'SILICONFLOW_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { messages, systemPrompt, userTurnCount, userJustConfirmed, conversationResetAfterPrescription, isGeneralQuestion, userSaysAllFine, userNeedsPlanCard, isVagueSymptom } = await req.json()

    // 构建发送给硅基流动的消息列表
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    // 在最后一条 user 消息末尾追加系统提示
    const lastUserIdx = apiMessages.map(m => m.role).lastIndexOf('user')
    if (lastUserIdx !== -1) {
      let hint = ''
      // 💡 提取出开方卡片的严格格式要求，防止代码重复，也防止 AI 忘掉格式
      const FORMAT_PROMPT = '必须包含 ```json 代码块，内容为 {"type":"prescription","warm_words":"...","diagnosis_result":"...","summary":"...","recipes":[{"category":"tea",...},{"category":"meal",...},{"category":"classic",...}],"acupoints":[{"name":"...","location":"...","method":"..."} 或 {"name":"无","location":"无","method":"无"}],"lifestyle":["..."]}。recipes 必须有 tea、meal、classic 三类。严禁只输出纯文字不输出 JSON。'
  
      if (userSaysAllFine) {
        hint = '用户表示一切良好，请停止追问，简短祝福即可。严禁输出 JSON。'
      } else if (isGeneralQuestion) {
        hint = '用户在问知识类问题，请直接回答，不要追问症状。严禁输出 JSON。'
      } else if (userJustConfirmed) {
        // 绝对指令：用户主动点确认（如"没有其他症状了"），无视轮数，直接开方
        hint = `用户已确认没有其他症状或要求直接开方，请立即结束问诊，输出详细的处方 JSON 卡片（type: "prescription"）。\n格式要求：${FORMAT_PROMPT}`
      } else {
        // 🚀 核心修复：模糊表述必须多轮追问；用户要方案时也要先问清
        const needMoreRounds = isVagueSymptom ? userTurnCount < 4 : userTurnCount < 3
        if (needMoreRounds) {
          if (isVagueSymptom) {
            hint = `【重要】用户描述较模糊（如累、没劲、不舒服等），必须从睡眠、饮食、情绪、二便、舌苔、怕冷怕热等多维度追问，当前仅第 ${userTurnCount} 轮，【绝对不要】急于开方！请继续追问并附带 type: "inquiry" 的 JSON 选项卡片。`
          } else if (userNeedsPlanCard) {
            hint = `【重要】用户表达了想要"食疗/调理/方案"的意愿，但当前是问诊初期（第 ${userTurnCount} 轮），信息尚不充分。请先安抚用户，然后【绝对不要】在这一轮输出 prescription！请继续追问（睡眠、二便、饮食、舌苔等），并在回复末尾务必附带 type: "inquiry" 的 JSON 选项卡片。`
          } else {
            hint = `【重要】当前是问诊初期（第 ${userTurnCount} 轮）。除非用户明确说"直接开方"，否则【绝对不要】输出 prescription！请继续追问（睡眠、二便、饮食、怕冷怕热、舌苔等），并在回复末尾务必附带 type: "inquiry" 的 JSON 选项卡片。`
          }
        } else {
          if (userNeedsPlanCard) {
            // 聊够了，并且用户主动要方案了：立刻给
            hint = `【进度提示】问诊已进行 ${userTurnCount} 轮，且用户明确请求调理/食疗方案。请立即输出 type: "prescription" 的 JSON 卡片给出完整的调理方案。\n格式要求：${FORMAT_PROMPT}`
          } else {
            // 聊够了，用户没主动要：AI自行判断
            hint = `【进度提示】问诊已进行 ${userTurnCount} 轮。请自行判断：如果用户的核心症状、舌象/二便/睡眠等信息已经足够明确，请直接输出 type: "prescription" 的 JSON 卡片给出完整的调理方案（格式要求：${FORMAT_PROMPT}）；如果信息依然很模糊且无法辩证，你可以继续追问并附带 inquiry 卡片。`
          }
        }
      }
  
      // 💡 如果是开过方之后的复诊，追加一条前置提醒（这样它就不会掩盖掉上面的核心判断）
      if (conversationResetAfterPrescription) {
        hint = "【特别提醒】上一轮问诊已开方完毕，现在是全新的问诊对话。请务必忘记之前的症状，当做全新的病人来诊断。\n" + hint
      }
      apiMessages[lastUserIdx] = {
        ...apiMessages[lastUserIdx],
        content: `${apiMessages[lastUserIdx].content}\n【系统提示：用户已进行了 ${userTurnCount} 轮对话。${hint}】`,
      }
    }

    const upstream = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: apiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unknown error')
      return new Response(JSON.stringify({ error: `Upstream error(${upstream.status}): ${errorText}` }), {
        status: upstream.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // 直接将硅基流动的 SSE 流透传给前端
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
