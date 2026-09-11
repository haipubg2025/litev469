import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel, HarmCategory, HarmBlockThreshold } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API route for health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API route for fetching models from a given proxy URL
  app.post("/api/proxy-models", async (req, res) => {
    try {
      const { baseUrl, format } = req.body;
      const key = req.body.key ? req.body.key.trim() : '';
      const baseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      // We won't add Authorization to baseHeaders globally anymore to prevent Gemini conflicts
      const openaiHeaders = { ...baseHeaders };
      if (key) openaiHeaders['Authorization'] = `Bearer ${key}`;

      const geminiHeaders = { ...baseHeaders };
      if (key) {
        geminiHeaders['x-goog-api-key'] = key;
        // Many custom proxies (like GG公益站) require Authorization header even for Gemini format
        if (!baseUrl.includes('generativelanguage.googleapis.com')) {
          geminiHeaders['Authorization'] = `Bearer ${key}`;
        }
      }

      // Prepare possible requests based on format
      let cleanedUrl = baseUrl.trim().replace(/\/+$/, '');
      if (cleanedUrl.endsWith('/chat/completions')) {
        cleanedUrl = cleanedUrl.replace(/\/chat\/completions$/, '');
      }
      
      const possibleRequests: { url: string, headers: Record<string, string> }[] = [];
      let baseWithoutSuffix = cleanedUrl.replace(/\/v1$/, '').replace(/\/v1beta$/, '');

      if (format === 'openai') {
        possibleRequests.push({ url: `${baseWithoutSuffix}/v1/models`, headers: openaiHeaders });
      } else if (format === 'gemini') {
        possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models?key=${key}`, headers: geminiHeaders });
        possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models`, headers: geminiHeaders });
      } else {
        // auto
        possibleRequests.push({ url: `${baseWithoutSuffix}/v1/models`, headers: openaiHeaders });
        possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models?key=${key}`, headers: geminiHeaders });
        possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models`, headers: geminiHeaders });
      }

      // Also include the original requested URL just in case
      if (!possibleRequests.some(r => r.url === `${cleanedUrl}/models`)) {
        possibleRequests.push({ url: `${cleanedUrl}/models`, headers: openaiHeaders });
      }

      let data = null;
      let lastError = null;

      for (const reqConfig of possibleRequests) {
        try {
          const response = await fetch(reqConfig.url, { 
            headers: reqConfig.headers,
            signal: AbortSignal.timeout(15000)
          });
          if (response.ok) {
            data = await response.json();
            break;
          } else {
            const errText = await response.text();
            lastError = new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
            
            // If authentication failed, stop trying other endpoints, the key is clearly invalid
            if (response.status === 401 || response.status === 403) {
              break;
            }

            // If it failed but there's a key and no query param, try with query param
            if (key && !reqConfig.url.includes('?key=')) {
              const altResponse = await fetch(`${reqConfig.url}?key=${key}`, { 
                headers: reqConfig.headers,
                signal: AbortSignal.timeout(15000)
              });
              if (altResponse.ok) {
                data = await altResponse.json();
                break;
              } else {
                 const altErrText = await altResponse.text();
                 lastError = new Error(`HTTP ${altResponse.status}: ${altErrText.substring(0, 200)}`);
                 if (altResponse.status === 401 || altResponse.status === 403) {
                   break;
                 }
              }
            }
          }
        } catch (err: any) {
          lastError = err;
          if (err.name === 'TimeoutError' || err.message.includes('fetch failed')) {
            break;
          }
        }
      }

      if (data) {
        return res.json(data);
      }

      throw new Error(lastError ? (lastError as any).message : "Không thể tải models từ proxy");
    } catch (error: any) {
      console.error("Lỗi khi load models proxy:", error);
      res.status(500).json({ error: error.message || "Failed to load" });
    }
  });

  // Helper function to format AI error messages nicely (specifically 429 Quota limits and 524 Proxy timeouts)
  function formatAiErrorMessage(error: any): string {
    const errMsg = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    const lower = errMsg.toLowerCase();
    
    // Báo lỗi chính xác về Token Limits (vượt mức Token)
    if (lower.includes("input_token_count") || lower.includes("tokens per minute") || lower.includes("tpm") || lower.includes("token limits")) {
      return "Lỗi API: Bạn đã vượt quá giới hạn Token (số lượng ký tự) cho phép của API Key trong 1 phút. Cụ thể: Vượt mức 250.000 input tokens.\n👉 Mẹo: Hãy chat chậm lại, ấn dọn dẹp lịch sử chat, hoặc nâng cấp thanh toán API Key để gỡ bỏ giới hạn này.";
    }
    
    // Báo lỗi chính xác về Rate Limits (số lượng Yêu cầu/phút)
    if (lower.includes("requests per minute") || lower.includes("rpm") || lower.includes("rate limit")) {
      return "Lỗi API: Bạn đã gửi quá nhiều yêu cầu trong 1 phút (Vượt giới hạn RPM của API Key).\n👉 Mẹo: Vui lòng chat chậm lại.";
    }

    // Lỗi 429 Quota Exceeded chung
    if (lower.includes("quota exceeded") || lower.includes("429") || lower.includes("resource_exhausted")) {
      return "Lỗi API: Hạn ngạch của API Key đã cạn kiệt (429 Quota Exceeded).";
    }
    
    if (lower.includes("api key") || lower.includes("api_key") || lower.includes("key not found") || lower.includes("invalid key")) {
      return "Lỗi API: API Key của bạn không hợp lệ hoặc thiếu. Vui lòng cập nhật trong phần Cài đặt.";
    }

    return "[Chi tiết lỗi gốc từ server AI]: " + errMsg;
  }

  // API route for generating content with stream
  app.post("/api/generate-stream", async (req, res) => {
    try {
      const { prompt, schema, activeProxy, providedApiKey, systemInstruction, temperature, topP, topK, selectedAIModel, imagesBase64 } = req.body;

      let model = selectedAIModel || "gemini-3.6-flash";
      let aiClient: GoogleGenAI;

      if (activeProxy && activeProxy.url && activeProxy.key) {
        model = activeProxy.selectedModel || "";
        aiClient = new GoogleGenAI({ 
          apiKey: activeProxy.key, 
          httpOptions: { baseUrl: activeProxy.url, timeout: 600000 }
        });
        console.log(`[Proxy enabled] Using custom proxy: ${activeProxy.url}`);
      } else {
        const apiKey = providedApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.status(400).json({ error: "Không tìm thấy API Key cấu hình." });
          return;
        }
        aiClient = new GoogleGenAI({ 
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' }, timeout: 600000 } // Tăng giới hạn timeout lên 10 phút
        });
        console.log(`[API Key enabled] Using standard API Key`);
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      req.setTimeout(600000); // Tăng giới hạn Timeout của route lên 10 phút
      res.setTimeout(600000);
      res.flushHeaders();

      const sysInstruction = systemInstruction || "";


      const authType = (activeProxy && activeProxy.url && activeProxy.key) ? "Proxy" : "API Key";
      const initPayload = JSON.stringify({
        thought: `[SYSTEM] Đang xử lý bằng ${authType} | Model: ${model}\n`,
        text: "",
        usage: null
      });
      res.write(`data: ${initPayload}\n\n`);

      // Gửi Ping (Heartbeat) mỗi 5 giây để giữ connection không bị Nginx/CloudRun cắt sau 50-60s timeout ẩn
      const heartbeatInterval = setInterval(() => {
        res.write(": keep-alive\n\n");
      }, 5000);

      req.on('close', () => {
        clearInterval(heartbeatInterval);
      });

      try {
        if (authType === "Proxy") {
          await handleProxyGeneration(req, res, activeProxy, model, prompt, schema, sysInstruction, temperature, topP, topK, imagesBase64);
        } else {
          await handleApiKeyGeneration(req, res, aiClient!, model, prompt, schema, sysInstruction, temperature, topP, topK, imagesBase64);
        }

        clearInterval(heartbeatInterval);
        res.write("data: [DONE]\n\n");
        res.end();

      } catch (error: any) {
        clearInterval(heartbeatInterval);
        throw error;
      }

    } catch (error: any) {
      const errMsg = error.message || String(error);
      if (errMsg.includes("429") || errMsg.includes("404") || errMsg.includes("403") || errMsg.includes("Quota")) {
        console.warn("[AI Server] Yêu cầu bị từ chối bởi API (Quota/Auth/Not Found)");
      } else {
        console.error("Lỗi tạo nội dung từ AI:", error);
      }
      const friendlyError = formatAiErrorMessage(error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: friendlyError })}\n\n`);
      res.end();
    }
  });

  async function handleProxyGeneration(req: any, res: any, activeProxy: any, model: string, prompt: string, schema: any, sysInstruction: string, temperature: number, topP: number, topK: number, imagesBase64?: string[]) {
        // BỘ GIẢI MÃ MẠNG CHO PROXY (TỰ ĐỘNG XỬ LÝ FORMAT RƠI RỚT CỦA CÁC ĐẦU PROXY)
        let proxyBaseUrl = activeProxy.url.trim().replace(/\/+$/, '');
        if (proxyBaseUrl.endsWith('/chat/completions')) {
           proxyBaseUrl = proxyBaseUrl.replace(/\/chat\/completions$/, '');
        }
        
        let isOAI = !activeProxy.key.startsWith("AIza"); // Defaults to auto-guessing
        if (proxyBaseUrl.includes("generativelanguage.googleapis.com")) isOAI = false;
        
        if (activeProxy.format === 'openai') {
          isOAI = true;
        } else if (activeProxy.format === 'gemini') {
          isOAI = false;
        }
        
        let targetUrl = "";
        let reqBody: any = {};
        
        // Xây dựng parts cho Gemini
        const geminiParts: any[] = [];
        if (imagesBase64?.length) {
           for (const imgStr of imagesBase64) {
               const mimeMatch = imgStr.match(/^data:(image\/\w+);base64,/);
               let mimeType = "image/jpeg";
               let base64Data = imgStr;
               if (mimeMatch) {
                  mimeType = mimeMatch[1];
                  base64Data = imgStr.substring(mimeMatch[0].length);
               }
               geminiParts.push({
                   inlineData: {
                       mimeType: mimeType,
                       data: base64Data
                   }
               });
           }
        }
        geminiParts.push({ text: prompt });
        
        // Xây dựng parts cho OpenAI
        let openAiContent: any = prompt;
        if (imagesBase64?.length) {
           openAiContent = [];
           for (const imgStr of imagesBase64) {
               openAiContent.push({
                   type: "image_url",
                   image_url: { url: imgStr }
               });
           }
           openAiContent.push({ type: "text", text: prompt });
        }

        if (isOAI) {
           if (!proxyBaseUrl.includes("chat/completions")) {
              if (!proxyBaseUrl.includes("/v1")) proxyBaseUrl += "/v1";
              targetUrl = `${proxyBaseUrl}/chat/completions`;
           } else {
              targetUrl = proxyBaseUrl;
           }
           
           reqBody = {
              model: model,
              messages: [],
              temperature: typeof temperature === 'number' ? temperature : 0.7,
              top_p: typeof topP === 'number' ? topP : 0.95,
              stream: true,
              stream_options: { include_usage: true }
           };
           
           if (sysInstruction) {
              reqBody.messages.push({ role: "system", content: sysInstruction });
           }
           reqBody.messages.push({ role: "user", content: openAiContent });
           
           // Cho OpenAI format, schema phức tạp có thể truyền qua response_format JSON
           if (schema) {
              reqBody.response_format = { type: "json_object" };
              reqBody.messages.push({ role: "system", content: "You MUST return a valid JSON object."});
           }
        } else {
            if (!proxyBaseUrl.includes('/v1beta') && !proxyBaseUrl.includes('/v1alpha') && !proxyBaseUrl.includes('/v1')) {
              proxyBaseUrl += '/v1beta';
            }
            targetUrl = `${proxyBaseUrl}/models/${model}:streamGenerateContent?alt=sse`;
            
            reqBody = {
              contents: [{ role: "user", parts: geminiParts }],
              generationConfig: {
                temperature: typeof temperature === 'number' ? temperature : 0.7,
                topP: typeof topP === 'number' ? topP : 0.95,
                topK: typeof topK === 'number' ? topK : 40,
                maxOutputTokens: 65536,
              },
              safetySettings: [
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
              ]
            };
            if (schema) {
              reqBody.generationConfig.responseMimeType = "application/json";
              reqBody.generationConfig.responseSchema = schema;
            }
            if (sysInstruction) {
              reqBody.systemInstruction = { parts: [{ text: sysInstruction }] };
            }
        }
        
        try {
           const headers: Record<string, string> = {
             'Content-Type': 'application/json',
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
           };
           if (activeProxy.key) {
             const proxyKey = activeProxy.key.trim();
             if (isOAI) {
               headers['Authorization'] = `Bearer ${proxyKey}`;
             } else {
               headers['x-goog-api-key'] = proxyKey;
               if (!activeProxy.url.includes('generativelanguage.googleapis.com')) {
                 headers['Authorization'] = `Bearer ${proxyKey}`;
               }
             }
           }

           const proxyStreamRes = await fetch(targetUrl, {
             method: 'POST',
             headers,
             body: JSON.stringify(reqBody),
             // signal: AbortSignal.timeout(600000) removed
           });
           
           if (!proxyStreamRes.ok) {
             let errText = await proxyStreamRes.text().catch(()=>'');
             if (errText.includes("<!DOCTYPE") || errText.includes("<html") || errText.includes("cf-error")) {
               if (proxyStreamRes.status === 524) {
                 errText = "Cloudflare Error 524: Máy chủ Proxy phản hồi quá thời gian chờ (Timeout 100s).";
               } else {
                 errText = `Cloudflare/HTTP Error ${proxyStreamRes.status}: Máy chủ Proxy trả về trang HTML lỗi.`;
               }
             } else if (errText.length > 250) {
               errText = errText.substring(0, 250) + "...";
             }
             throw new Error(`Proxy error: ${proxyStreamRes.status} - ${errText}`);
           }
           if (!proxyStreamRes.body) throw new Error('Proxy returned empty body');

           const reader = proxyStreamRes.body.getReader();
           const decoder = new TextDecoder("utf-8");
           let buffer = "";

           while (true) {
             const { done, value } = await reader.read();
             if (done) break;

             buffer += decoder.decode(value, { stream: true });
             
             let boundary = buffer.indexOf('\n');
             while (boundary !== -1) {
               let line = buffer.slice(0, boundary).trim();
               buffer = buffer.slice(boundary + 1);
               boundary = buffer.indexOf('\n');

               if (line.startsWith("data: ")) {
                 const dataStr = line.slice(6).trim();
                 if (!dataStr) continue;
                 if (dataStr === "[DONE]") continue; // Ignore proxy's own done
                 try {
                   const parsedObj = JSON.parse(dataStr);
                   const items = Array.isArray(parsedObj) ? parsedObj : [parsedObj];
                   
                   for (const chunkData of items) {
                       let textPart = "";
                       let thoughtPart = "";
                       let usage = null;
                       
                       if (chunkData.usageMetadata || chunkData.usage) {
                          usage = chunkData.usageMetadata || chunkData.usage;
                       }
                       
                       // Gemini Format
                       if (chunkData.candidates && chunkData.candidates[0]) {
                          const candidate = chunkData.candidates[0];
                          if (candidate.content && candidate.content.parts) {
                              candidate.content.parts.forEach((p: any) => {
                                 if (p.text) textPart += p.text;
                                 if (p.thought) thoughtPart += p.thought;
                              });
                          }
                       } 
                       // OpenAI Format (fallback)
                       else if (chunkData.choices && chunkData.choices[0] && chunkData.choices[0].delta) {
                          if (chunkData.choices[0].delta.content) {
                             textPart += chunkData.choices[0].delta.content;
                          }
                          if (chunkData.choices[0].delta.reasoning_content) {
                             thoughtPart += chunkData.choices[0].delta.reasoning_content;
                          }
                       }
                       // If neither, just dump raw
                       else if (!chunkData.usageMetadata && !chunkData.usage) {
                          textPart = `\n[UNRECOGNIZED PROXY FORMAT]: ${JSON.stringify(chunkData)}\n`;
                       }

                       if (textPart || thoughtPart || usage) {
                           const payload = JSON.stringify({ thought: thoughtPart, text: textPart, usage });
                           res.write(`data: ${payload}\n\n`);
                       }
                   }
                 } catch(e) {
                   const payload = JSON.stringify({ thought: "", text: `\n[RAW PROXY CHUNK]: ${dataStr}\n`, usage: null });
                   res.write(`data: ${payload}\n\n`);
                 }
               } else {
                  try {
                    const rawJson = JSON.parse(line);
                    if (rawJson.error) {
                      throw new Error(rawJson.error.message || "Lỗi Proxy");
                    } else if (rawJson.candidates) {
                       let textPart = "";
                       let thoughtPart = "";
                       rawJson.candidates[0]?.content?.parts?.forEach((p: any) => {
                          if (p.text) textPart += p.text;
                          if (p.thought) thoughtPart += p.thought;
                       });
                       const payload = JSON.stringify({ thought: thoughtPart, text: textPart, usage: rawJson.usageMetadata || null });
                       res.write(`data: ${payload}\n\n`);
                    } else if (rawJson.choices && rawJson.choices[0] && rawJson.choices[0].delta) {
                       let textPart = rawJson.choices[0].delta.content || "";
                       let thoughtPart = rawJson.choices[0].delta.reasoning_content || "";
                       const payload = JSON.stringify({ thought: thoughtPart, text: textPart, usage: rawJson.usage || null });
                       res.write(`data: ${payload}\n\n`);
                    } else {
                        // Trả về thẳng text nếu json không đúng format Gemini
                        const payload = JSON.stringify({ thought: "", text: `\n[UNRECOGNIZED JSON]: ${line}\n`, usage: null });
                        res.write(`data: ${payload}\n\n`);
                    }
                  } catch (err) {
                    // Nếu không parse được JSON và không phải data:
                    if (line.trim() && line !== "[DONE]" && line !== "]" && line !== "[" && !line.startsWith(":")) {
                        const payload = JSON.stringify({ thought: "", text: `\n[NON-JSON RAW TEXT]: ${line}\n`, usage: null });
                        res.write(`data: ${payload}\n\n`);
                    }
                  }
               }
             }
           }
           
           // PROCESS REMAINING BUFFER IF ANY
           if (buffer.trim()) {
              let line = buffer.trim();
              if (line.startsWith("data: ")) {
                 const dataStr = line.slice(6).trim();
                 if (dataStr && dataStr !== "[DONE]") {
                   try {
                     const chunkData = JSON.parse(dataStr);
                     let textPart = "";
                     let thoughtPart = "";
                     let usage = null;
                     if (chunkData.usageMetadata || chunkData.usage) {
                        usage = chunkData.usageMetadata || chunkData.usage;
                     }
                     if (chunkData.candidates && chunkData.candidates[0]?.content?.parts) {
                        chunkData.candidates[0].content.parts.forEach((p: any) => {
                           if (p.text) textPart += p.text;
                           if (p.thought) thoughtPart += p.thought;
                        });
                     } else if (chunkData.choices && chunkData.choices[0] && chunkData.choices[0].delta) {
                        if (chunkData.choices[0].delta.content) textPart += chunkData.choices[0].delta.content;
                        if (chunkData.choices[0].delta.reasoning_content) thoughtPart += chunkData.choices[0].delta.reasoning_content;
                     }
                     const payload = JSON.stringify({ thought: thoughtPart, text: textPart, usage });
                     res.write(`data: ${payload}\n\n`);
                   } catch(e) {
                     const payload = JSON.stringify({ thought: "", text: `\n[RAW PROXY REMAINING CHUNK]: ${dataStr}\n`, usage: null });
                     res.write(`data: ${payload}\n\n`);
                   }
                 }
              } else if (line.startsWith("{")) {
                  try {
                    const rawJson = JSON.parse(line);
                    if (rawJson.error) {
                      throw new Error(rawJson.error.message || "Lỗi Proxy");
                    } else if (rawJson.candidates) {
                       let textPart = "";
                       let thoughtPart = "";
                       rawJson.candidates[0]?.content?.parts?.forEach((p: any) => {
                          if (p.text) textPart += p.text;
                          if (p.thought) thoughtPart += p.thought;
                       });
                       const payload = JSON.stringify({ thought: thoughtPart, text: textPart, usage: rawJson.usageMetadata || null });
                       res.write(`data: ${payload}\n\n`);
                    } else if (rawJson.choices && rawJson.choices[0] && rawJson.choices[0].delta) {
                       let textPart = rawJson.choices[0].delta.content || "";
                       let thoughtPart = rawJson.choices[0].delta.reasoning_content || "";
                       const payload = JSON.stringify({ thought: thoughtPart, text: textPart, usage: rawJson.usage || null });
                       res.write(`data: ${payload}\n\n`);
                    } else {
                       const payload = JSON.stringify({ thought: "", text: `\n[UNRECOGNIZED REMAINING JSON]: ${line}\n`, usage: null });
                       res.write(`data: ${payload}\n\n`);
                    }
                  } catch (err) {
                    if (line.trim() && line !== "[DONE]" && line !== "]" && line !== "[" && !line.startsWith(":")) {
                       const payload = JSON.stringify({ thought: "", text: `\n[NON-JSON RAW REMAINING TEXT]: ${line}\n`, usage: null });
                       res.write(`data: ${payload}\n\n`);
                    }
                  }
              }
           }
        } catch (err: any) {
           throw err;
        }
  }

  async function handleApiKeyGeneration(req: any, res: any, aiClient: GoogleGenAI, model: string, prompt: string, schema: any, sysInstruction: string, temperature: number, topP: number, topK: number, imagesBase64?: string[]) {
        try {
          const isProModel = model.toLowerCase().includes("pro");
          const supportsThinking = model.toLowerCase().includes("thinking");

          let config: any = {
            temperature: typeof temperature === 'number' ? temperature : 0.7,
            topP: typeof topP === 'number' ? topP : 0.95,
            topK: typeof topK === 'number' ? topK : 40,
            systemInstruction: sysInstruction
          };

          if (isProModel) {
            // Cấu trúc riêng cho dòng Pro
            config = {
               ...config,
               maxOutputTokens: 65536,
            };
            if (supportsThinking && !schema) {
               config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
            }
          } else {
            // Cấu trúc riêng cho dòng Flash
            config = {
               ...config,
               maxOutputTokens: 65536, // Đã cập nhật lên 65536 theo thông số chính thức
            };
          }

          if (schema) {
             config.responseMimeType = "application/json";
             config.responseSchema = schema;
          }
          
          let contentsToPass: any = prompt;
          if (imagesBase64?.length) {
              const geminiParts: any[] = [];
              for (const imgStr of imagesBase64) {
                 const mimeMatch = imgStr.match(/^data:(image\/\w+);base64,/);
                 let mimeType = "image/jpeg";
                 let base64Data = imgStr;
                 if (mimeMatch) {
                    mimeType = mimeMatch[1];
                    base64Data = imgStr.substring(mimeMatch[0].length);
                 }
                 geminiParts.push({
                     inlineData: {
                         mimeType: mimeType,
                         data: base64Data
                     }
                 });
              }
              geminiParts.push({ text: prompt });
              contentsToPass = geminiParts;
          }

          const response = await aiClient.models.generateContent({
            model,
            contents: contentsToPass,
            config
          });

          let thoughtPart = "";
          let textPart = "";
          
          if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.finishReason && candidate.finishReason !== "STOP") {
               console.log(`[Response End] finishReason: ${candidate.finishReason}`);
               if (candidate.finishReason === "SAFETY" || candidate.finishReason === "BLOCKLIST" || candidate.finishReason === "RECITATION") {
                  throw new Error(`SAFETY: Nội dung bị chặn bởi hệ thống an toàn của Google (FinishReason: ${candidate.finishReason}).`);
               }
            }
            if (candidate.content?.parts) {
              for (const part of candidate.content.parts) {
                if ('thought' in part && part.thought) {
                  thoughtPart += (typeof part.thought === 'string') ? part.thought : (part.text || "");
                } else if (part.text) {
                  textPart += part.text;
                }
              }
            }
          }
          
          const payload = JSON.stringify({
            thought: thoughtPart,
            text: textPart,
            usage: response.usageMetadata || null
          });
          res.write(`data: ${payload}\n\n`);
        } catch (err: any) {
          throw err;
        }
  }

  // Catch-all for AI Studio internal routes to prevent SPA fallback returning HTML
  app.use('/__aistudio_internal_control_plane', (req, res) => {
    res.status(404).end();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
