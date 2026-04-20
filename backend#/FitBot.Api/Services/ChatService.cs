//// Services/ChatService.cs
//using FitBot.Api.Data;
//using FitBot.Api.DTOs;
//using FitBot.Api.Models;
//using System.Net.Http.Headers;
//using System.Text;
//using System.Text.Json;

//namespace FitBot.Api.Services
//{
//    public class ChatService : IChatService
//    {
//        private readonly IConfiguration _config;
//        private readonly IHttpClientFactory _httpClientFactory;
//        private readonly AppDbContext _context;
//        private readonly ILogger<ChatService> _logger;

//        private static readonly string[] DietKeywords =
//        {
//            "recipe", "meal", "food", "diet", "eat", "nutrition", "calorie",
//            "breakfast", "lunch", "dinner", "snack", "ingredient", "cook",
//            "protein meal", "high protein", "low carb", "keto meal"
//        };

//        public ChatService(
//            IConfiguration config,
//            IHttpClientFactory httpClientFactory,
//            AppDbContext context,
//            ILogger<ChatService> logger)
//        {
//            _config = config;
//            _httpClientFactory = httpClientFactory;
//            _context = context;
//            _logger = logger;
//        }

//        // ── Public entry point ────────────────────────────────────────────────
//        public async Task<ChatResponseDto> GetAiResponseAsync(
//            string message,
//            List<ChatHistoryItem> history,
//            UserProfile? profile)
//        {
//            string systemPrompt = BuildSystemPrompt(profile);

//            // ── Diet path: Spoonacular data → AI enrichment ───────────────────
//            if (IsDietQuery(message))
//            {
//                var spoonData = await TrySpoonacularAsync(message, profile);
//                if (spoonData != null)
//                {
//                    string enrichPrompt =
//                        $"The user asked: \"{message}\"\n\n" +
//                        $"Spoonacular returned:\n{spoonData}\n\n" +
//                        "Using the user profile above, give a concise personalised recommendation.";

//                    // Try OpenAI enrichment → Gemini enrichment → raw Spoonacular text
//                    var enriched =
//                        await TryOpenAiAsync(enrichPrompt, history, systemPrompt)
//                        ?? await TryGeminiAsync(enrichPrompt, history, systemPrompt);

//                    return new ChatResponseDto
//                    {
//                        Reply = enriched ?? spoonData,
//                        Source = enriched != null ? "spoonacular+ai" : "spoonacular"
//                    };
//                }
//            }

//            var geminiReply = await TryGeminiAsync(message, history, systemPrompt);
//            if (geminiReply != null)
//                return new ChatResponseDto { Reply = geminiReply, Source = "gemini" };

//            _logger.LogWarning("Gemini unavailable or returned null, trying open ai…");

//            // ── General path: OpenAI → Gemini → hard error ────────────────────
//            var openAiReply = await TryOpenAiAsync(message, history, systemPrompt);
//            if (openAiReply != null)
//                return new ChatResponseDto { Reply = openAiReply, Source = "openai" };



//            _logger.LogError(
//                "All AI providers failed. " +
//                "Verify ApiKeys:OpenAI and ApiKeys:Gemini in appsettings.json.");

//            return new ChatResponseDto
//            {
//                Reply =
//                    "I'm currently unable to reach the AI service. " +
//                    "Please check that your API keys are correctly set in appsettings.json " +
//                    "(ApiKeys:OpenAI and/or ApiKeys:Gemini) and restart the server.",
//                Source = "error"
//            };
//        }

//        // ── System prompt ─────────────────────────────────────────────────────
//        private static string BuildSystemPrompt(UserProfile? profile)
//        {
//            var sb = new StringBuilder();
//            sb.AppendLine("You are FitBot, an expert AI fitness assistant.");
//            sb.AppendLine("Provide personalised, evidence-based advice on workouts, nutrition, and fitness.");
//            sb.AppendLine("Be encouraging, specific, and actionable. Format plans clearly.");
//            sb.AppendLine("Never provide medical diagnoses. For serious concerns, recommend a doctor.");

//            if (profile != null)
//            {
//                sb.AppendLine("\n=== USER PROFILE — personalise ALL responses to this ===");
//                sb.AppendLine($"Age: {profile.Age}");
//                sb.AppendLine($"Gender: {profile.Gender}");
//                sb.AppendLine($"Height: {profile.Height} cm");
//                sb.AppendLine($"Current Weight: {profile.Weight} kg");
//                sb.AppendLine($"BMI: {profile.BmiValue:F1}");
//                sb.AppendLine($"Target Weight: {profile.TargetWeight} kg");
//                sb.AppendLine($"Goal: {(profile.Weight > profile.TargetWeight
//                    ? $"Lose {profile.Weight - profile.TargetWeight:F1} kg"
//                    : $"Gain {profile.TargetWeight - profile.Weight:F1} kg")}");
//                if (!string.IsNullOrWhiteSpace(profile.HealthIssues))
//                    sb.AppendLine($"Health Issues: {profile.HealthIssues} — ALWAYS account for these.");
//            }
//            else
//            {
//                sb.AppendLine("\nNo profile loaded — give general fitness advice and suggest setting up a profile.");
//            }

//            return sb.ToString();
//        }

//        // ── Diet keyword check ────────────────────────────────────────────────
//        private static bool IsDietQuery(string message)
//            => DietKeywords.Any(k => message.Contains(k, StringComparison.OrdinalIgnoreCase));

//        // ── OpenAI ────────────────────────────────────────────────────────────
//        private async Task<string?> TryOpenAiAsync(
//            string message, List<ChatHistoryItem> history, string systemPrompt)
//        {
//            var apiKey = _config["ApiKeys:OpenAI"];
//            if (string.IsNullOrWhiteSpace(apiKey))
//            {
//                _logger.LogWarning("OpenAI key missing (ApiKeys:OpenAI)");
//                return null;
//            }

//            try
//            {
//                var client = _httpClientFactory.CreateClient();
//                client.Timeout = TimeSpan.FromSeconds(20); // ← don't hang forever
//                client.DefaultRequestHeaders.Authorization =
//                    new AuthenticationHeaderValue("Bearer", apiKey);

//                var messages = new List<object>
//                {
//                    new { role = "system", content = systemPrompt }
//                };
//                foreach (var h in history.TakeLast(10))
//                    messages.Add(new { role = h.Role, content = h.Content });
//                messages.Add(new { role = "user", content = message });

//                var body = new
//                {
//                    model = "gpt-4o-mini",
//                    messages,
//                    max_tokens = 1500,
//                    temperature = 0.7
//                };

//                var response = await client.PostAsync(
//                    "https://api.openai.com/v1/chat/completions",
//                    new StringContent(
//                        JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));

//                var text = await response.Content.ReadAsStringAsync();

//                if (!response.IsSuccessStatusCode)
//                {
//                    _logger.LogError("OpenAI {Status}: {Body}", response.StatusCode, text);
//                    return null;
//                }

//                using var json = JsonDocument.Parse(text);
//                return json.RootElement
//                    .GetProperty("choices")[0]
//                    .GetProperty("message")
//                    .GetProperty("content")
//                    .GetString();
//            }
//            catch (TaskCanceledException)
//            {
//                _logger.LogWarning("OpenAI timed out — falling back to Gemini");
//                return null;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "OpenAI exception");
//                return null;
//            }
//        }

//        // ── Gemini ────────────────────────────────────────────────────────────
//        private async Task<string?> TryGeminiAsync(
//            string message, List<ChatHistoryItem> history, string systemPrompt)
//        {
//            var apiKey = _config["ApiKeys:Gemini"];
//            if (string.IsNullOrWhiteSpace(apiKey))
//            {
//                _logger.LogWarning("Gemini key missing (ApiKeys:Gemini)");
//                return null;
//            }

//            try
//            {
//                var client = _httpClientFactory.CreateClient();
//                client.Timeout = TimeSpan.FromSeconds(20);

//                var contents = new List<object>();
//                bool injected = false;

//                foreach (var h in history.TakeLast(8))
//                {
//                    var role = h.Role == "assistant" ? "model" : "user";
//                    var text = (!injected && role == "user")
//                        ? $"{systemPrompt}\n\n{h.Content}"
//                        : h.Content;
//                    if (role == "user") injected = true;
//                    contents.Add(new { role, parts = new[] { new { text } } });
//                }

//                var userText = !injected
//                    ? $"{systemPrompt}\n\n{message}"
//                    : message;
//                contents.Add(new { role = "user", parts = new[] { new { text = userText } } });

//                var body = new
//                {
//                    contents,
//                    generationConfig = new { maxOutputTokens = 1500, temperature = 0.7 }
//                };

//                var url = $"https://generativelanguage.googleapis.com/v1beta/" +
//                          $"models/gemini-2.0-flash:generateContent?key={apiKey}";

//                var response = await client.PostAsync(url,
//                    new StringContent(
//                        JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));

//                var responseText = await response.Content.ReadAsStringAsync();

//                if (!response.IsSuccessStatusCode)
//                {
//                    _logger.LogError("Gemini {Status}: {Body}", response.StatusCode, responseText);
//                    return null;
//                }

//                using var json = JsonDocument.Parse(responseText);
//                return json.RootElement
//                    .GetProperty("candidates")[0]
//                    .GetProperty("content")
//                    .GetProperty("parts")[0]
//                    .GetProperty("text")
//                    .GetString();
//            }
//            catch (TaskCanceledException)
//            {
//                _logger.LogWarning("Gemini timed out");
//                return null;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Gemini exception");
//                return null;
//            }
//        }

//        // ── Spoonacular ───────────────────────────────────────────────────────
//        private async Task<string?> TrySpoonacularAsync(string message, UserProfile? profile)
//        {
//            var apiKey = _config["ApiKeys:Spoonacular"];
//            if (string.IsNullOrWhiteSpace(apiKey))
//            {
//                _logger.LogWarning("Spoonacular key missing (ApiKeys:Spoonacular)");
//                return null;
//            }

//            try
//            {
//                var client = _httpClientFactory.CreateClient();
//                client.Timeout = TimeSpan.FromSeconds(15);

//                var query = ExtractFoodQuery(message);
//                var diet = GetDietFilter(profile);
//                var intolerances = GetIntolerances(profile);

//                var url = "https://api.spoonacular.com/recipes/complexSearch" +
//                          $"?apiKey={apiKey}" +
//                          $"&query={Uri.EscapeDataString(query)}" +
//                          "&number=5&addRecipeNutrition=true" +
//                          (diet != null ? $"&diet={diet}" : "") +
//                          (intolerances != null ? $"&intolerances={intolerances}" : "");

//                var response = await client.GetAsync(url);
//                var text = await response.Content.ReadAsStringAsync();

//                if (!response.IsSuccessStatusCode)
//                {
//                    _logger.LogError("Spoonacular {Status}: {Body}", response.StatusCode, text);
//                    return null;
//                }

//                using var json = JsonDocument.Parse(text);
//                var results = json.RootElement.GetProperty("results");
//                if (results.GetArrayLength() == 0) return null;

//                var sb = new StringBuilder();
//                sb.AppendLine($"Recipes for \"{query}\":\n");

//                foreach (var r in results.EnumerateArray())
//                {
//                    var title = r.GetProperty("title").GetString() ?? "Unknown";

//                    // FIX: parse nutrition once into a local variable
//                    string calories = "N/A";
//                    string protein = "N/A";
//                    if (r.TryGetProperty("nutrition", out var nutr)
//                        && nutr.TryGetProperty("nutrients", out var nutrients))
//                    {
//                        calories = GetNutrient(nutrients, "Calories");
//                        protein = GetNutrient(nutrients, "Protein");
//                    }

//                    sb.AppendLine($"  {title}  (Calories: {calories}, Protein: {protein})");
//                }

//                return sb.ToString();
//            }
//            catch (TaskCanceledException)
//            {
//                _logger.LogWarning("Spoonacular timed out");
//                return null;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Spoonacular exception");
//                return null;
//            }
//        }

//        // ── helpers ───────────────────────────────────────────────────────────
//        private static string ExtractFoodQuery(string message)
//        {
//            var stopWords = new[]
//            {
//                "give me", "show me", "suggest", "recommend", "what are",
//                "i want", "ideas for", "some", "a ", "the "
//            };
//            var lower = message.ToLowerInvariant();
//            foreach (var s in stopWords)
//                lower = lower.Replace(s, " ");
//            return lower.Trim();
//        }

//        private static string? GetDietFilter(UserProfile? p)
//        {
//            if (p == null) return null;
//            var issues = p.HealthIssues.ToLowerInvariant();
//            if (issues.Contains("diabetes")) return "diabetic";
//            if (issues.Contains("vegetarian")) return "vegetarian";
//            if (issues.Contains("vegan")) return "vegan";
//            return null;
//        }

//        private static string? GetIntolerances(UserProfile? p)
//        {
//            if (p == null) return null;
//            var issues = p.HealthIssues.ToLowerInvariant();
//            var list = new List<string>();
//            if (issues.Contains("gluten")) list.Add("gluten");
//            if (issues.Contains("lactose") || issues.Contains("dairy")) list.Add("dairy");
//            if (issues.Contains("nut")) list.Add("peanut,tree nut");
//            return list.Count > 0 ? string.Join(",", list) : null;
//        }

//        private static string GetNutrient(JsonElement nutrients, string name)
//        {
//            foreach (var n in nutrients.EnumerateArray())
//                if (n.GetProperty("name").GetString() == name)
//                    return $"{n.GetProperty("amount").GetDouble():F0}" +
//                           $"{n.GetProperty("unit").GetString()}";
//            return "N/A";
//        }

//        public async Task<List<object>> GetHistoryAsync(int userId)
//            => await Task.FromResult(
//                _context.ChatHistory
//                    .Where(m => m.UserId == userId)
//                    .OrderByDescending(m => m.Timestamp)
//                    .Take(50)
//                    .Select(m => (object)new { m.Message, m.IsBot, m.Timestamp })
//                    .ToList());
//    }
//}




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
        // Find your system prompt string and replace or add to it
        private const string SystemPrompt = @"
            You are FitBot AI, a professional fitness and health assistant.

            ALWAYS format your responses using markdown:
            - Use **bold** for exercise names and key terms
            - Use bullet points for lists of exercises or tips
            - Use numbered lists for step-by-step instructions  
            - Use ### headings to separate sections when response is long
            - Keep responses clear and structured — never a wall of plain text
            - End with an encouraging line

            Example format:
            ### Shoulder Workout Plan

            Here are the best exercises for your shoulders:

            - **Lateral Raises** — targets side deltoids
            - **Overhead Press** — builds overall mass
            - **Front Raises** — isolates front deltoid

            **Key tips:**
            1. Start light, focus on form
            2. Keep core tight throughout
            3. Control the negative movement

            You've got this! Consistency is everything. 💪
            ";
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

        public async Task<ChatResponseDto> GetAiResponseAsync(
            string message,
            List<ChatHistoryItem> history,
            UserProfile? profile)
        {
            string systemPrompt = BuildSystemPrompt(profile);

            // Route everything through Gemini
            var geminiReply = await CallGeminiApiAsync(message, history, systemPrompt);

            if (geminiReply != null)
            {
                return new ChatResponseDto
                {
                    Reply = geminiReply,
                    Source = "gemini"
                };
            }

            // Fallback error if Gemini fails
            _logger.LogError("Gemini API returned null or failed. Check API Key in appsettings.json.");

            return new ChatResponseDto
            {
                Reply = "I'm having trouble connecting to my brain (Gemini API) right now. Please try again in a moment.",
                Source = "error"
            };
        }

        private async Task<string?> CallGeminiApiAsync(
            string message, List<ChatHistoryItem> history, string systemPrompt)
        {
            var apiKey = _config["ApiKeys:Gemini"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Gemini API Key is missing in appsettings.json");
                return null;
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                var contents = new List<object>();
                bool systemPromptInjected = false;

                // Map history to Gemini format (user/model)
                // We take last 10 messages for context
                foreach (var h in history.TakeLast(10))
                {
                    var role = h.Role.ToLower() == "assistant" ? "model" : "user";
                    var text = h.Content;

                    // Inject system prompt into the first user message of the history
                    if (!systemPromptInjected && role == "user")
                    {
                        text = $"{systemPrompt}\n\nUser Input: {text}";
                        systemPromptInjected = true;
                    }

                    contents.Add(new { role, parts = new[] { new { text } } });
                }

                // Add the current message
                var currentText = !systemPromptInjected
                    ? $"{systemPrompt}\n\nUser Input: {message}"
                    : message;

                contents.Add(new { role = "user", parts = new[] { new { text = currentText } } });

                var body = new
                {
                    contents,
                    generationConfig = new
                    {
                        maxOutputTokens = 2048,
                        temperature = 0.7,
                        topP = 0.8,
                        topK = 40
                    }
                };

                // Using Gemini 1.5 Flash for speed and efficiency
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
                //var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";
                var response = await client.PostAsync(url,
                    new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));

                var responseText = await response.Content.ReadAsStringAsync();

                //if (!response.IsSuccessStatusCode)
                //{
                //    _logger.LogError("Gemini API Error {Status}: {Body}", response.StatusCode, responseText);
                //    return null;
                //}
                //checking
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini API FAILED: {Status} {Error}", response.StatusCode, error);
                    return null;
                }

                using var json = JsonDocument.Parse(responseText);
                return json.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while calling Gemini API");
                return null;
            }
        }

        private static string BuildSystemPrompt(UserProfile? profile)
        {
            var sb = new StringBuilder();
            sb.AppendLine("You are FitBot, a professional AI fitness and nutrition coach.");
            sb.AppendLine("Guidelines:");
            sb.AppendLine("- Provide actionable, science-based advice.");
            sb.AppendLine("- Be motivating but professional.");
            sb.AppendLine("- Use Markdown (bolding, lists) for readability.");
            sb.AppendLine("- If the user asks for recipes, provide nutritional breakdowns.");

            if (profile != null)
            {
                sb.AppendLine("\n[USER CONTEXT]");
                sb.AppendLine($"- Age/Gender: {profile.Age} yrs, {profile.Gender}");
                sb.AppendLine($"- Stats: {profile.Height}cm, {profile.Weight}kg (BMI: {profile.BmiValue:F1})");
                sb.AppendLine($"- Goal: Target weight is {profile.TargetWeight}kg.");
                if (!string.IsNullOrWhiteSpace(profile.HealthIssues))
                    sb.AppendLine($"- Medical Notes: {profile.HealthIssues} (Ensure advice is safe for these conditions).");
            }
            else
            {
                sb.AppendLine("\nNote: User profile not found. Provide general advice and encourage them to complete their profile.");
            }

            return sb.ToString();
        }

        public async Task<List<object>> GetHistoryAsync(int userId)
        {
            return await Task.FromResult(
                _context.ChatHistory
                    .Where(m => m.UserId == userId)
                    .OrderByDescending(m => m.Timestamp)
                    .Take(50)
                    .Select(m => (object)new { m.Message, m.IsBot, m.Timestamp })
                    .ToList());
        }
    }
}