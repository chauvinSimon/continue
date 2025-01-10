import { SlashCommand } from "../../index.js";
import { removeQuotesAndEscapes } from "../../util/index.js";
import { renderChatMessage } from "../../util/messageContent.js";

const HttpPromptSlashCommand: SlashCommand = {
  name: "httpprompt",
  description: "Call an HTTP endpoint to create a prompt, then passed to the llm",
  run: async function* ({ ide, llm, input, params, fetch }) {
    const url = params?.url;
    if (!url) {
      throw new Error("URL is not defined in params");
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: removeQuotesAndEscapes(input),
      }),
    });

    if (response.body === null) {
      throw new Error("Response body is null");
    }

    const prompt = await response.text();

    for await (const chunk of llm.streamChat(
      [{ role: "user", content: prompt }],
      new AbortController().signal,
    )) {
      yield renderChatMessage(chunk);
    }

  },
};

export default HttpPromptSlashCommand;
