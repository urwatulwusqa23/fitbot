using FitBot.Api.DTOs;
using FitBot.Api.Models;
using FitBot.Api.Services;
using FitBot.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using FitBot.Api.Services;

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

        public ChatController(IChatService chatService, IProfileService profileService,
            IVideoService videoService, AppDbContext db)
        {
            _chatService = chatService;
            _profileService = profileService;
            _videoService = videoService;
            _db = db;
        }

        // ── Send message ──────────────────────────────────────────────────────
        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequestDto request)
        {
            try
            {
                UserProfile? profile = null;
                // TODO: uncomment auth when ready
                // var username = User.FindFirst(ClaimTypes.Name)?.Value;
                // var user = await _profileService.GetUserByUsernameAsync(username);
                // profile = user?.Profile;

                var aiTask = _chatService.GetAiResponseAsync(request.Message, request.History, profile);
                bool isVideoRequest = IsVideoRequest(request.Message);
                Task<ChatVideoResponseDto>? videoTask = isVideoRequest
                    ? _videoService.ProcessChatPromptAsync(request.Message)
                    : null;

                await Task.WhenAll(aiTask, videoTask ?? Task.CompletedTask);

                var aiResult = await aiTask;
                var videoResult = videoTask != null ? await videoTask : null;

                // Detect plan type in reply for save button hint
                var replyLower = aiResult.Reply.ToLower();
                bool isDietReply = replyLower.Contains("calorie") || replyLower.Contains("meal") || replyLower.Contains("diet") || replyLower.Contains("nutrition");
                bool isExerciseReply = replyLower.Contains("workout") || replyLower.Contains("exercise") || replyLower.Contains("sets") || replyLower.Contains("reps");

                return Ok(new
                {
                    reply = aiResult.Reply,
                    source = aiResult.Source,
                    videos = videoResult?.Videos,
                    videoMessage = videoResult?.Message,
                    planType = isDietReply ? "diet" : isExerciseReply ? "exercise" : (string?)null
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("CHAT ERROR: " + ex.Message);
                return StatusCode(500, new { reply = "Sorry, I encountered an error.", source = "error" });
            }
        }

        // ── Save diet plan ────────────────────────────────────────────────────
        [HttpPost("save-diet")]
        [Authorize]
        public async Task<IActionResult> SaveDietPlan([FromBody] SavePlanDto dto)
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            var user = await _profileService.GetUserByUsernameAsync(username);
            if (user == null) return Unauthorized();

            var plan = new DietPlan
            {
                UserId = user.Id,
                Title = dto.Title,
                PlanType = dto.PlanType,
                PlanJson = dto.PlanJson
            };
            _db.DietPlans.Add(plan);
            await _db.SaveChangesAsync();
            return Ok(new { id = plan.Id, message = "Diet plan saved!" });
        }

        // ── Get saved diet plans ──────────────────────────────────────────────
        [HttpGet("diet-plans")]
        [Authorize]
        public async Task<IActionResult> GetDietPlans()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            var plans = await _db.DietPlans
                .Where(p => p.UserId == user.Id)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new { p.Id, p.Title, p.PlanType, p.CreatedAt, p.IsActive })
                .ToListAsync();
            return Ok(plans);
        }

        // ── Save exercise plan ────────────────────────────────────────────────
        [HttpPost("save-exercise")]
        [Authorize]
        public async Task<IActionResult> SaveExercisePlan([FromBody] SavePlanDto dto)
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            var plan = new ExercisePlan
            {
                UserId = user.Id,
                Title = dto.Title,
                SplitType = dto.PlanType,
                PlanJson = dto.PlanJson
            };
            _db.ExercisePlans.Add(plan);
            await _db.SaveChangesAsync();
            return Ok(new { id = plan.Id, message = "Exercise plan saved!" });
        }

        // ── Get saved exercise plans ──────────────────────────────────────────
        [HttpGet("exercise-plans")]
        [Authorize]
        public async Task<IActionResult> GetExercisePlans()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            var plans = await _db.ExercisePlans
                .Where(p => p.UserId == user.Id)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new { p.Id, p.Title, p.SplitType, p.CreatedAt, p.IsActive })
                .ToListAsync();
            return Ok(plans);
        }

        // ── Like / unlike video ───────────────────────────────────────────────
        [HttpPost("like-video")]
        [Authorize]
        public async Task<IActionResult> LikeVideo([FromBody] LikeVideoDto dto)
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

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
                Title = dto.Title,
                ThumbnailUrl = dto.ThumbnailUrl,
                YoutubeUrl = dto.YoutubeUrl
            });
            await _db.SaveChangesAsync();
            return Ok(new { liked = true, message = "Video liked!" });
        }

        // ── Get liked videos ──────────────────────────────────────────────────
        [HttpGet("liked-videos")]
        [Authorize]
        public async Task<IActionResult> GetLikedVideos()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            var videos = await _db.LikedVideos
                .Where(v => v.UserId == user.Id)
                .OrderByDescending(v => v.LikedAt)
                .ToListAsync();
            return Ok(videos);
        }

        // ── Chat history ──────────────────────────────────────────────────────
        [HttpGet("history")]
        [Authorize]
        public async Task<IActionResult> GetHistory()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            var history = await _db.ChatHistories
                .Where(h => h.UserId == user.Id)
                .OrderByDescending(h => h.CreatedAt)
                .Take(100)
                .ToListAsync();
            return Ok(history);
        }

        // ── Save chat messages (call after bot reply) ─────────────────────────
        [HttpPost("save-history")]
        [Authorize]
        public async Task<IActionResult> SaveHistory([FromBody] List<ChatHistoryItem> messages, [FromQuery] string sessionId)
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            var records = messages.Select(m => new ChatHistory
            {
                UserId = user.Id,
                SessionId = sessionId,
                Role = m.Role,
                Content = m.Content
            }).ToList();

            _db.ChatHistories.AddRange(records);
            await _db.SaveChangesAsync();
            return Ok();
        }

        // ── Deep memory: upsert ───────────────────────────────────────────────
        [HttpPost("memory")]
        [Authorize]
        public async Task<IActionResult> UpsertMemory([FromBody] List<DeepMemoryDto> items)
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            foreach (var item in items)
            {
                var existing = await _db.DeepMemories
                    .FirstOrDefaultAsync(m => m.UserId == user.Id && m.MemoryKey == item.Key);
                if (existing != null)
                {
                    existing.MemoryValue = item.Value;
                    existing.Category = item.Category;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _db.DeepMemories.Add(new DeepMemory
                    {
                        UserId = user.Id,
                        MemoryKey = item.Key,
                        MemoryValue = item.Value,
                        Category = item.Category
                    });
                }
            }
            await _db.SaveChangesAsync();
            return Ok();
        }

        // ── Get deep memory ───────────────────────────────────────────────────
        [HttpGet("memory")]
        [Authorize]
        public async Task<IActionResult> GetMemory()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = await _profileService.GetUserByUsernameAsync(username!);
            if (user == null) return Unauthorized();

            var memory = await _db.DeepMemories
                .Where(m => m.UserId == user.Id)
                .ToListAsync();
            return Ok(memory);
        }

        private static bool IsVideoRequest(string message)
        {
            var lower = message.ToLowerInvariant();
            var triggers = new[] { "video", "watch", "workout", "exercise", "show me", "recommend", "youtube", "tutorial", "how to", "demonstrate", "routine" };
            return triggers.Any(t => lower.Contains(t));
        }
    }
}