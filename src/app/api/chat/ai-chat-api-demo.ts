// 请求CURL示例：
// curl https://ark.cn-beijing.volces.com/api/v3/chat/completions \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer $ARK_API_KEY" \
//   -d $'{
//     "messages": [
//         {
//             "content": "You are a helpful assistant.",
//             "role": "system"
//         },
//         {
//             "content": "hello",
//             "role": "user"
//         }
//     ],
//     "model": "doubao-1-5-pro-32k-250115",
//     "stream": true
// }'

// 示例使用 Pages Router (pages/api/chat.js)
export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    try {
      const userMessage = req.body.message; // 从前端获取用户消息

      const response = await fetch(
        "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.ARK_API_KEY}`, // 使用环境变量中的API Key
          },
          body: JSON.stringify({
            model: "您的Endpoint_ID", // 例如 ep-2025xxxxxxxx
            messages: [
              { role: "user", content: userMessage },
              // 可在此添加system message或历史对话记录以实现多轮对话
            ],
            stream: true, // 设为true则使用“流式响应”
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      // 返回模型的回复
      res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
      console.error("调用大模型API出错:", error);
      res.status(500).json({ error: "服务器内部错误" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
