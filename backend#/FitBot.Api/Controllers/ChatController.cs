using FitBot.Api.DTOs;
using FitBot.Api.Models;
using FitBot.Api.Services;
using FitBot.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IProfileService _profileService;
        private readonly IVideoService _videoService;
        private readonly AppDbContext _db;
        private readonly ILogger<ChatController> _logger;

        public ChatController(
            IChatService chatService,
            IProfileService profileService,
            IVideoService videoService,
            AppDbContext db,
            ILogger<ChatController> logger)
        {
            _chatService = chatService;
            _profileService = profileService;
            _videoService = videoService;
            _db = db;
            _logger = logger;
        }

        // ── helper: get current user from JWT ────────────────────────────────
        private async Task<User?> GetCurrentUserAsync()
        {
            // Try ClaimTypes.Name first, then "name" claim, then NameIdentifier
            var username = User.FindFirst(ClaimTypes.Name)?.Value
                        ?? User.FindFirst("name")?.Value
                        ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(username))
            {
                _logger.LogWarning("GetCurrentUserAsync: no username claim found. Claims: {Claims}",
                    string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));
                return null;
            }

            return await _profileService.GetUserByUsernameAsync(username);
        }

        // ── Send message ──────────────────────────────────────────────────────
        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequestDto request)
        {
            try
            {
                // Get profile if user is logged in — optional, works without auth too
                UserProfile? profile = null;
                var username = User.FindFirst(ClaimTypes.Name)?.Value
                            ?? User.FindFirst("name")?.Value;
                if (!string.IsNullOrEmpty(username))
                {
                    var user = await _profileService.GetUserByUsernameAsync(username);
                    profile = user?.Profile;

                    // Save user message to chat history
                    if (user != null && !string.IsNullOrEmpty(request.SessionId))
                    {
                        _db.ChatHistories.Add(new ChatHistory
                        {
                            UserId = user.Id,
                            SessionId = request.SessionId,
                            Role = "user",
                            Content = request.Message
                        });
                        await _db.SaveChangesAsync();
                    }
                }

                var aiTask = _chatService.GetAiResponseAsync(request.Message, request.History, profile);
                bool isVideoRequest = IsVideoRequest(request.Message);
                Task<ChatVideoResponseDto>? videoTask = isVideoRequest
                    ? _videoService.ProcessChatPromptAsync(request.Message)
                    : null;

                await Task.WhenAll(aiTask, videoTask ?? Task.CompletedTask);

                var aiResult = await aiTask;
                var videoResult = videoTask != null ? await videoTask : null;

                // Save bot reply to chat history
                if (!string.IsNullOrEmpty(username) && !string.IsNullOrEmpty(request.SessionId))
                {
                    var user = await _profileService.GetUserByUsernameAsync(username);
                    if (user != null)
                    {
                        _db.ChatHistories.Add(new ChatHistory
                        {
                            UserId = user.Id,
                            SessionId = request.SessionId,
                            Role = "assistant",
                            Content = aiResult.Reply
                        });
                        await _db.SaveChangesAsync();
                    }
                }

                // Detect plan type
                var replyLower = aiResult.Reply.ToLower();
                bool isDietReply = replyLower.Contains("calorie") || replyLower.Contains("breakfast") ||
                    replyLower.Contains("meal") || replyLower.Contains("diet") || replyLower.Contains("nutrition");
                bool isExerciseReply = replyLower.Contains("sets") || replyLower.Contains("reps") ||
                    replyLower.Contains("workout") || replyLower.Contains("day 1") || replyLower.Contains("split");

                // Map videos to include proper fields for frontend
                var mappedVideos = videoResult?.Videos?.Select(v => new
                {
                    videoId = v.Id.ToString(),   // frontend expects videoId as string
                    id = v.Id.ToString(),
                    title = v.Title,
                    url = v.Link,
                    youtubeUrl = v.Link,
                    thumbnail = GetYoutubeThumbnail(v.Link),
                    thumbnailUrl = GetYoutubeThumbnail(v.Link),
                }).ToList();

                return Ok(new
                {
                    reply = aiResult.Reply,
                    source = aiResult.Source,
                    videos = mappedVideos,
                    videoMessage = videoResult?.Message,
                    planType = isDietReply ? "diet" : isExerciseReply ? "exercise" : (string?)null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendMessage error");
                return StatusCode(500, new { reply = "Sorry, I encountered an error.", source = "error" });
            }
        }

        // ── Save diet plan ────────────────────────────────────────────────────
        [HttpPost("save-diet")]
        [Authorize]
        public async Task<IActionResult> SaveDietPlan([FromBody] SavePlanDto dto)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized(new { message = "User not found from token" });

            _db.DietPlans.Add(new DietPlan
            {
                UserId = user.Id,
                Title = dto.Title,
                PlanType = dto.PlanType,
                PlanJson = dto.PlanJson
            });
            await _db.SaveChangesAsync();
            return Ok(new { message = "Diet plan saved!" });
        }

        // ── Get diet plans ────────────────────────────────────────────────────────
        [HttpGet("diet-plans")]
        [Authorize]
        public async Task<IActionResult> GetDietPlans()
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized();

            var plans = await _db.DietPlans
                .Where(p => p.UserId == user.Id)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new {
                    p.Id,
                    p.Title,
                    p.PlanType,
                    p.PlanJson,      // ← ADD THIS
                    p.CreatedAt,
                    p.IsActive
                })
                .ToListAsync();
            return Ok(plans);
        }

        // ── Save exercise plan ────────────────────────────────────────────────
        [HttpPost("save-exercise")]
        [Authorize]
        public async Task<IActionResult> SaveExercisePlan([FromBody] SavePlanDto dto)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized(new { message = "User not found from token" });

            _db.ExercisePlans.Add(new ExercisePlan
            {
                UserId = user.Id,
                Title = dto.Title,
                SplitType = dto.PlanType,
                PlanJson = dto.PlanJson
            });
            await _db.SaveChangesAsync();
            return Ok(new { message = "Exercise plan saved!" });
        }

        // ── Get exercise plans ────────────────────────────────────────────────────
        [HttpGet("exercise-plans")]
        [Authorize]
        public async Task<IActionResult> GetExercisePlans()
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized();

            var plans = await _db.ExercisePlans
                .Where(p => p.UserId == user.Id)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new {
                    p.Id,
                    p.Title,
                    p.SplitType,
                    p.PlanJson,      // ← ADD THIS
                    p.CreatedAt,
                    p.IsActive
                })
                .ToListAsync();
            return Ok(plans);
        }

        // ── Like / unlike video ───────────────────────────────────────────────
        [HttpPost("like-video")]
        [Authorize]
        public async Task<IActionResult> LikeVideo([FromBody] LikeVideoDto dto)
        {
            if (string.IsNullOrEmpty(dto.VideoId))
                return BadRequest(new { message = "VideoId is required" });

            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized(new { message = "User not found from token" });

            var existing = await _db.LikedVideos
                .FirstOrDefaultAsync(v => v.UserId == user.Id && v.VideoId == dto.VideoId);

            if (existing != null)
            {
                _db.LikedVideos.Remove(existing);
                await _db.SaveChangesAsync();
                return Ok(new { liked = false, message = "Removed from liked videos." });
            }

            _db.LikedVideos.Add(new LikedVideo
            {
                UserId = user.Id,
                VideoId = dto.VideoId,
                Title = dto.Title ?? "",
                ThumbnailUrl = dto.ThumbnailUrl,
                YoutubeUrl = dto.YoutubeUrl ?? ""
            });
            await _db.SaveChangesAsync();
            return Ok(new { liked = true, message = "Video liked!" });
        }

        // ── Get liked videos ──────────────────────────────────────────────────
        [HttpGet("liked-videos")]
        [Authorize]
        public async Task<IActionResult> GetLikedVideos()
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized();

            var videos = await _db.LikedVideos
                .Where(v => v.UserId == user.Id)
                .OrderByDescending(v => v.LikedAt)
                .ToListAsync();
            return Ok(videos);
        }

        // ── Get chat history ──────────────────────────────────────────────────
        [HttpGet("history")]
        [Authorize]
        public async Task<IActionResult> GetHistory()
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized();

            var history = await _db.ChatHistories
                .Where(h => h.UserId == user.Id)
                .OrderByDescending(h => h.CreatedAt)
                .Take(100)
                .ToListAsync();
            return Ok(history);
        }

        // ── Deep memory upsert ────────────────────────────────────────────────
        [HttpPost("memory")]
        [Authorize]
        public async Task<IActionResult> UpsertMemory([FromBody] List<DeepMemoryDto> items)
        {
            if (items == null || items.Count == 0)
                return BadRequest(new { message = "No items provided" });

            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized(new { message = "User not found from token" });

            foreach (var item in items)
            {
                if (string.IsNullOrEmpty(item.Key)) continue;

                var existing = await _db.DeepMemories
                    .FirstOrDefaultAsync(m => m.UserId == user.Id && m.MemoryKey == item.Key);

                if (existing != null)
                {
                    existing.MemoryValue = item.Value ?? "";
                    existing.Category = item.Category;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _db.DeepMemories.Add(new DeepMemory
                    {
                        UserId = user.Id,
                        MemoryKey = item.Key,
                        MemoryValue = item.Value ?? "",
                        Category = item.Category
                    });
                }
            }
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Saved {items.Count} memory items" });
        }

        // ── Get deep memory ───────────────────────────────────────────────────
        [HttpGet("memory")]
        [Authorize]
        public async Task<IActionResult> GetMemory()
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return Unauthorized();

            var memory = await _db.DeepMemories
                .Where(m => m.UserId == user.Id)
                .ToListAsync();
            return Ok(memory);
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        private static bool IsVideoRequest(string message)
        {
            var lower = message.ToLowerInvariant();
            var triggers = new[] {
                "video", "watch", "workout", "exercise", "show me",
                "recommend", "youtube", "tutorial", "how to", "demonstrate", "routine"
            };
            return triggers.Any(t => lower.Contains(t));
        }

        private static string GetYoutubeThumbnail(string link)
        {
            if (string.IsNullOrEmpty(link)) return "";
            // Extract video ID from YouTube URL
            var uri = new Uri(link);
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            var videoId = query["v"];
            if (!string.IsNullOrEmpty(videoId))
                return $"https://img.youtube.com/vi/{videoId}/mqdefault.jpg";
            return "";
        }
    }
}