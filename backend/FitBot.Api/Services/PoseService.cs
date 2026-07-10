// Services/PoseService.cs
using FitBot.Api.Data;
using FitBot.Api.DTOs;
using FitBot.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FitBot.Api.Services
{
    public class PoseService : IPoseService
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<PoseService> _logger;

        // Python FastAPI base URL — set in appsettings.json
        private string PythonServiceUrl =>
            _config["PythonService:BaseUrl"] ?? "http://localhost:8000";

        public PoseService(
            AppDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            ILogger<PoseService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        // ── Main: call Python, store result ─────────────────────────────────
        public async Task<ReferenceMotionResponseDto> ProcessReferenceVideoAsync(
            int videoId, string videoPath, string exerciseName, int sampleRate = 5)
        {
            // 1. Check if already processed for this video
            var existing = await _context.ReferenceMotions
                .FirstOrDefaultAsync(r => r.VideoId == videoId);

            if (existing != null)
            {
                _logger.LogInformation("Reference motion already exists for VideoId {Id}", videoId);
                return MapToDto(existing);
            }

            // 2. Call Python microservice
            var pythonResult = await CallPythonPoseServiceAsync(videoId, videoPath, exerciseName, sampleRate);

            if (!pythonResult.Success || pythonResult.MotionPattern == null)
                throw new InvalidOperationException(pythonResult.Error ?? "Pose processing failed.");

            // 3. Store in DB
            var record = new ReferenceMotion
            {
                VideoId = videoId,
                ExerciseName = exerciseName,
                TotalFramesProcessed = pythonResult.TotalFramesProcessed,
                MotionPatternJson = JsonSerializer.Serialize(pythonResult.MotionPattern),
                FramesDataJson = string.Empty,   // frames stored separately if needed
                VideoMetadataJson = pythonResult.VideoMetadata ?? "{}",
                CreatedAt = DateTime.UtcNow,
            };

            _context.ReferenceMotions.Add(record);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Stored reference motion for VideoId {Id}, {Frames} frames processed",
                videoId, pythonResult.TotalFramesProcessed);

            return MapToDto(record);
        }

        // ── Query helpers ────────────────────────────────────────────────────
        public async Task<ReferenceMotionResponseDto?> GetReferenceMotionByVideoIdAsync(int videoId)
        {
            var record = await _context.ReferenceMotions
                .FirstOrDefaultAsync(r => r.VideoId == videoId);
            return record == null ? null : MapToDto(record);
        }

        public async Task<List<ReferenceMotionResponseDto>> GetAllReferenceMotionsAsync()
        {
            var records = await _context.ReferenceMotions
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return records.Select(MapToDto).ToList();
        }

        public async Task<bool> DeleteReferenceMotionAsync(int id)
        {
            var record = await _context.ReferenceMotions.FindAsync(id);
            if (record == null) return false;
            _context.ReferenceMotions.Remove(record);
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Internal: HTTP call to FastAPI ───────────────────────────────────
        private async Task<PoseProcessResponseDto> CallPythonPoseServiceAsync(
            int videoId, string videoPath, string exerciseName, int sampleRate)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(5);  // video processing takes time

            var internalKey = _config["PythonService:InternalApiKey"];
            if (!string.IsNullOrWhiteSpace(internalKey))
                client.DefaultRequestHeaders.Add("X-Internal-Key", internalKey);

            var payload = new
            {
                video_id = videoId,
                video_path = videoPath,
                exercise_name = exerciseName,
                sample_rate = sampleRate,
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync(
                    $"{PythonServiceUrl}/api/process-uploaded-video", content);

                var responseJson = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Python service error: {Body}", responseJson);
                    return new PoseProcessResponseDto
                    {
                        Success = false,
                        Error = $"Python service returned {response.StatusCode}: {responseJson}"
                    };
                }

                var result = JsonSerializer.Deserialize<PoseProcessResponseDto>(
                    responseJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return result ?? new PoseProcessResponseDto { Success = false, Error = "Empty response" };
            }
            catch (TaskCanceledException)
            {
                return new PoseProcessResponseDto { Success = false, Error = "Python service timed out." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to reach Python pose service");
                return new PoseProcessResponseDto { Success = false, Error = ex.Message };
            }
        }

        // ── Mapper ───────────────────────────────────────────────────────────
        private static ReferenceMotionResponseDto MapToDto(ReferenceMotion r)
        {
            object? pattern = null;
            if (!string.IsNullOrEmpty(r.MotionPatternJson))
            {
                try { pattern = JsonSerializer.Deserialize<object>(r.MotionPatternJson); }
                catch { /* leave null */ }
            }

            return new ReferenceMotionResponseDto
            {
                Id = r.Id,
                VideoId = r.VideoId,
                ExerciseName = r.ExerciseName,
                TotalFramesProcessed = r.TotalFramesProcessed,
                MotionPattern = pattern,
                CreatedAt = r.CreatedAt,
                Status = "processed",
            };
        }
    }
}