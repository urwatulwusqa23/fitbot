// Services/ChatService.cs
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

        // ── Main entry point ──────────────────────────────────────────────────
        public async Task<ChatResponseDto> GetAiResponseAsync(
            string message,
            List<ChatHistoryItem> history,
            UserProfile? profile)
        {
            var systemPrompt = BuildSystemPrompt(profile);
            var reply = await CallGeminiAsync(message, history, systemPrompt);

            if (reply != null)
                return new ChatResponseDto { Reply = reply, Source = "gemini" };

            _logger.LogError("Gemini returned null reply.");
            return new ChatResponseDto
            {
                Reply = "I'm having trouble connecting right now. Please try again.",
                Source = "error"
            };
        }

        // ── Gemini API ────────────────────────────────────────────────────────
        private async Task<string?> CallGeminiAsync(
            string message,
            List<ChatHistoryItem> history,
            string systemPrompt)
        {
            var apiKey = _config["ApiKeys:Gemini"];

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogError("Gemini API key is missing from appsettings.json under ApiKeys:Gemini");
                return null;
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                // Build contents array — Gemini alternates user/model roles
                var contents = new List<object>();

                // Add history (last 10 messages, must alternate user/model)
                var recentHistory = history.TakeLast(10).ToList();
                foreach (var h in recentHistory)
                {
                    contents.Add(new
                    {
                        role = h.Role == "assistant" ? "model" : "user",
                        parts = new[] { new { text = h.Content } }
                    });
                }

                // Add current user message
                contents.Add(new
                {
                    role = "user",
                    parts = new[] { new { text = message } }
                });

                // Build request — use system_instruction for the prompt
                var requestBody = new
                {
                    system_instruction = new
                    {
                        parts = new[] { new { text = systemPrompt } }
                    },
                    contents,
                    generationConfig = new
                    {
                        maxOutputTokens = 2048,
                        temperature = 0.7
                    }
                };

                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

                var httpResponse = await client.PostAsync(
                    url,
                    new StringContent(
                        JsonSerializer.Serialize(requestBody),
                        Encoding.UTF8,
                        "application/json"));

                var rawJson = await httpResponse.Content.ReadAsStringAsync();

                // Log full response for debugging
                _logger.LogInformation("Gemini status: {Status}", httpResponse.StatusCode);
                _logger.LogInformation("Gemini raw response: {Body}", rawJson);

                if (!httpResponse.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini HTTP error {Status}: {Body}", httpResponse.StatusCode, rawJson);
                    return null;
                }

                using var doc = JsonDocument.Parse(rawJson);
                var root = doc.RootElement;

                // Check for API-level error inside 200 response
                if (root.TryGetProperty("error", out var errorProp))
                {
                    _logger.LogError("Gemini API error: {Error}", errorProp.ToString());
                    return null;
                }

                // Parse: candidates[0].content.parts[0].text
                if (!root.TryGetProperty("candidates", out var candidates) ||
                    candidates.GetArrayLength() == 0)
                {
                    _logger.LogError("Gemini: no candidates in response. Full response: {Body}", rawJson);
                    return null;
                }

                var firstCandidate = candidates[0];

                // Check finish reason
                if (firstCandidate.TryGetProperty("finishReason", out var finishReason))
                {
                    var reason = finishReason.GetString();
                    if (reason == "SAFETY" || reason == "RECITATION")
                    {
                        _logger.LogWarning("Gemini blocked response. Reason: {Reason}", reason);
                        return "I can't answer that specific question, but I'm here to help with fitness and nutrition topics!";
                    }
                }

                var text = firstCandidate
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                return text;
            }
            catch (TaskCanceledException)
            {
                _logger.LogError("Gemini request timed out.");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini exception: {Message}", ex.Message);
                return null;
            }
        }

        // ── System prompt ─────────────────────────────────────────────────────
        private static string BuildSystemPrompt(UserProfile? profile)
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
                sb.AppendLine();
                sb.AppendLine("USER PROFILE (use this to personalize every answer):");
                sb.AppendLine($"- Age: {profile.Age}");
                sb.AppendLine($"- Gender: {profile.Gender}");
                sb.AppendLine($"- Height: {profile.Height} cm");
                sb.AppendLine($"- Weight: {profile.Weight} kg");
                sb.AppendLine($"- BMI: {profile.BmiValue:F1}");
                sb.AppendLine($"- Target Weight: {profile.TargetWeight} kg");

                if (!string.IsNullOrWhiteSpace(profile.HealthIssues))
                    sb.AppendLine($"- Health Issues: {profile.HealthIssues}");
            }

            return sb.ToString();
        }

        // ── History (old table) ───────────────────────────────────────────────
        public async Task<List<object>> GetHistoryAsync(int userId)
        {
            return await Task.FromResult(
                _context.ChatMessages                          // fixed: was ChatHistory
                    .Where(x => x.UserId == userId)
                    .OrderByDescending(x => x.Timestamp)
                    .Take(50)
                    .Select(x => (object)new
                    {
                        x.Message,
                        x.IsBot,
                        x.Timestamp
                    })
                    .ToList());
        }
    }
}