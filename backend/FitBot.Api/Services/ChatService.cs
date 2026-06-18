using FitBot.Api.Data;
using FitBot.Api.DTOs;
using FitBot.Api.Models;
using System.Text;
using System.Text.Json;

namespace FitBot.Api.Services
{
    public class ChatService : IChatService
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _context;
        private readonly ILogger<ChatService> _logger;

        public ChatService(
            IConfiguration config,
            IHttpClientFactory httpClientFactory,
            AppDbContext context,
            ILogger<ChatService> logger)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
            _context = context;
            _logger = logger;
        }

        // ── Main entry — tries APIs in order until one works ──────────────────
        public async Task<ChatResponseDto> GetAiResponseAsync(
            string message,
            List<ChatHistoryItem> history,
            UserProfile? profile,
            IEnumerable<DeepMemory>? memory = null)
        {
            var systemPrompt = BuildSystemPrompt(profile, memory);

            // 1. Try Gemini first
            var geminiKey = _config["ApiKeys:Gemini"];
            if (!string.IsNullOrWhiteSpace(geminiKey))
            {
                _logger.LogInformation("Trying Gemini...");
                var reply = await CallGeminiAsync(message, history, systemPrompt, geminiKey);
                if (reply != null)
                    return new ChatResponseDto { Reply = reply, Source = "gemini" };
                _logger.LogWarning("Gemini failed, trying Groq...");
            }

            // 2. Try Groq second
            var groqKey = _config["ApiKeys:Groq"];
            if (!string.IsNullOrWhiteSpace(groqKey))
            {
                _logger.LogInformation("Trying Groq...");
                var reply = await CallGroqAsync(message, history, systemPrompt, groqKey);
                if (reply != null)
                    return new ChatResponseDto { Reply = reply, Source = "groq" };
                _logger.LogWarning("Groq failed, trying OpenAI...");
            }

            // 3. Try OpenAI last
            var openAiKey = _config["ApiKeys:OpenAI"];
            if (!string.IsNullOrWhiteSpace(openAiKey))
            {
                _logger.LogInformation("Trying OpenAI...");
                var reply = await CallOpenAiAsync(message, history, systemPrompt, openAiKey);
                if (reply != null)
                    return new ChatResponseDto { Reply = reply, Source = "openai" };
                _logger.LogWarning("OpenAI also failed.");
            }

            // All failed
            _logger.LogError("All AI providers failed.");
            return new ChatResponseDto
            {
                Reply = "I'm having trouble connecting to AI services right now. Please try again in a moment.",
                Source = "error"
            };
        }

        // ── Gemini ────────────────────────────────────────────────────────────
        private async Task<string?> CallGeminiAsync(
            string message,
            List<ChatHistoryItem> history,
            string systemPrompt,
            string apiKey)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                var contents = new List<object>();
                foreach (var h in history.TakeLast(10))
                {
                    contents.Add(new
                    {
                        role = h.Role == "assistant" ? "model" : "user",
                        parts = new[] { new { text = h.Content } }
                    });
                }
                contents.Add(new
                {
                    role = "user",
                    parts = new[] { new { text = message } }
                });

                var body = new
                {
                    system_instruction = new
                    {
                        parts = new[] { new { text = systemPrompt } }
                    },
                    contents,
                    generationConfig = new { maxOutputTokens = 8192, temperature = 0.7 }
                };
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

                //var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
                var httpResp = await client.PostAsync(url,
                    new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));

                var raw = await httpResp.Content.ReadAsStringAsync();
                _logger.LogInformation("Gemini status: {Status}", httpResp.StatusCode);

                if (!httpResp.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini error: {Body}", raw);
                    return null;
                }

                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;

                if (root.TryGetProperty("error", out _)) return null;
                if (!root.TryGetProperty("candidates", out var candidates) ||
                    candidates.GetArrayLength() == 0) return null;

                var candidate = candidates[0];
                if (candidate.TryGetProperty("finishReason", out var reason))
                {
                    var r = reason.GetString();
                    if (r == "SAFETY" || r == "RECITATION")
                        return "I can't answer that specific question, but I'm happy to help with fitness topics!";
                }

                return candidate
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini exception");
                return null;
            }
        }

        // ── Groq ──────────────────────────────────────────────────────────────
        private async Task<string?> CallGroqAsync(
            string message,
            List<ChatHistoryItem> history,
            string systemPrompt,
            string apiKey)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                // Build messages array — OpenAI-compatible format
                var messages = new List<object>
                {
                    new { role = "system", content = systemPrompt }
                };

                foreach (var h in history.TakeLast(10))
                {
                    messages.Add(new { role = h.Role, content = h.Content });
                }
                messages.Add(new { role = "user", content = message });

                var body = new
                {
                    model = "llama-3.3-70b-versatile",
                    messages,
                    max_tokens = 8000,
                    temperature = 0.7
                };

                var request = new HttpRequestMessage(HttpMethod.Post,
                    "https://api.groq.com/openai/v1/chat/completions");
                request.Headers.Add("Authorization", $"Bearer {apiKey}");
                request.Content = new StringContent(
                    JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

                var httpResp = await client.SendAsync(request);
                var raw = await httpResp.Content.ReadAsStringAsync();
                _logger.LogInformation("Groq status: {Status}", httpResp.StatusCode);

                if (!httpResp.IsSuccessStatusCode)
                {
                    _logger.LogError("Groq error: {Body}", raw);
                    return null;
                }

                using var doc = JsonDocument.Parse(raw);
                return doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Groq exception");
                return null;
            }
        }

        // ── OpenAI ────────────────────────────────────────────────────────────
        private async Task<string?> CallOpenAiAsync(
            string message,
            List<ChatHistoryItem> history,
            string systemPrompt,
            string apiKey)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                var messages = new List<object>
                {
                    new { role = "system", content = systemPrompt }
                };

                foreach (var h in history.TakeLast(10))
                {
                    messages.Add(new { role = h.Role, content = h.Content });
                }
                messages.Add(new { role = "user", content = message });

                var body = new
                {
                    model = "gpt-3.5-turbo",
                    messages,
                    max_tokens = 2048,
                    temperature = 0.7
                };

                var request = new HttpRequestMessage(HttpMethod.Post,
                    "https://api.openai.com/v1/chat/completions");
                request.Headers.Add("Authorization", $"Bearer {apiKey}");
                request.Content = new StringContent(
                    JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

                var httpResp = await client.SendAsync(request);
                var raw = await httpResp.Content.ReadAsStringAsync();
                _logger.LogInformation("OpenAI status: {Status}", httpResp.StatusCode);

                if (!httpResp.IsSuccessStatusCode)
                {
                    _logger.LogError("OpenAI error: {Body}", raw);
                    return null;
                }

                using var doc = JsonDocument.Parse(raw);
                return doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenAI exception");
                return null;
            }
        }

        // ── System prompt ─────────────────────────────────────────────────────
        private static string BuildSystemPrompt(UserProfile? profile, IEnumerable<DeepMemory>? memory = null)
        {
            var sb = new StringBuilder();
            sb.AppendLine("You are FitBot, an expert AI fitness and nutrition assistant.");
            sb.AppendLine("Always give clear, structured, actionable advice.");
            sb.AppendLine("Never provide medical diagnosis.");
            sb.AppendLine();
            sb.AppendLine("FORMATTING RULES — follow exactly:");
            sb.AppendLine("- For DIET PLANS: always use a Markdown table with columns: | Day | Breakfast | Lunch | Dinner | Snacks | Total Calories |");
            sb.AppendLine("- For WORKOUT PLANS: always use a Markdown table with columns: | Day | Muscle Group | Exercise | Sets | Reps | Rest |");
            sb.AppendLine("- For weekly plans: show 7 rows Monday to Sunday.");
            sb.AppendLine("- For monthly plans: show 4 weekly summary rows.");
            sb.AppendLine("- For general questions: use bullet points and short paragraphs.");
            sb.AppendLine("- Use **bold** for important terms.");

            if (profile != null)
            {
                var bmiCategory = GetBmiCategory(profile.BmiValue);
                sb.AppendLine();
                sb.AppendLine("USER PROFILE (personalize every answer based on this):");
                sb.AppendLine($"- Age: {profile.Age}");
                sb.AppendLine($"- Gender: {profile.Gender}");
                sb.AppendLine($"- Height: {profile.Height} cm");
                sb.AppendLine($"- Weight: {profile.Weight} kg");
                sb.AppendLine($"- BMI: {profile.BmiValue:F1} ({bmiCategory})");
                sb.AppendLine($"- Target Weight: {profile.TargetWeight} kg");
                if (!string.IsNullOrWhiteSpace(profile.HealthIssues))
                    sb.AppendLine($"- Health Issues: {profile.HealthIssues}");
            }

            // Include learned memory facts from past conversations
            var memoryList = memory?.ToList();
            if (memoryList != null && memoryList.Count > 0)
            {
                sb.AppendLine();
                sb.AppendLine("MEMORY (facts learned from this user's past conversations — treat as confirmed preferences):");
                foreach (var m in memoryList)
                {
                    var label = m.MemoryKey switch
                    {
                        "goal"             => "Fitness goal",
                        "diet_type"        => "Diet type",
                        "experience"       => "Experience level",
                        "workout_days"     => "Workout days per week",
                        "injury_knee"      => "Has knee injury/pain",
                        "injury_back"      => "Has back injury/pain",
                        "injury_shoulder"  => "Has shoulder injury/pain",
                        _                  => m.MemoryKey
                    };
                    sb.AppendLine($"- {label}: {m.MemoryValue}");
                }
            }

            return sb.ToString();
        }

        private static string GetBmiCategory(float bmi) => bmi switch
        {
            < 18.5f => "Underweight",
            < 25.0f => "Normal weight",
            < 30.0f => "Overweight",
            < 35.0f => "Obese Class I",
            _       => "Obese Class II+"
        };

        // ── History ───────────────────────────────────────────────────────────
        public async Task<List<object>> GetHistoryAsync(int userId)
        {
            return await Task.FromResult(
                _context.ChatMessages
                    .Where(x => x.UserId == userId)
                    .OrderByDescending(x => x.Timestamp)
                    .Take(50)
                    .Select(x => (object)new { x.Message, x.IsBot, x.Timestamp })
                    .ToList());
        }
    }
}