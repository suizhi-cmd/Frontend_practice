const assistantForm = document.getElementById("assistant-form");
const assistantQuestion = document.getElementById("assistant-question");
const assistantSend = document.getElementById("assistant-send");
const assistantReply = document.getElementById("assistant-reply");

if (assistantForm && assistantQuestion && assistantSend && assistantReply) {
  let isSending = false;

  assistantForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSending) return;

    const message = assistantQuestion.value.trim();

    if (!message) {
      assistantReply.textContent = "请先输入问题。";
      return;
    }

    isSending = true;
    assistantSend.disabled = true;
    assistantSend.textContent = "正在回复…";
    assistantReply.textContent = "正在思考，请稍候…";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(65000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "请求失败，请稍后重试。");
      }

      if (typeof data.reply !== "string") {
        throw new Error("回复格式异常，请重试。");
      }

      // 以纯文本显示回复，避免把模型内容当作 HTML 执行
      assistantReply.textContent = data.reply;
    } catch (error) {
      assistantReply.textContent =
        error.name === "TimeoutError"
          ? "等待回复超时，请稍后重试。"
          : error instanceof TypeError
            ? "连接失败，请确认后端正在运行。"
            : error.message;
    } finally {
      isSending = false;
      assistantSend.disabled = false;
      assistantSend.textContent = "发送问题";
    }
  });
}
