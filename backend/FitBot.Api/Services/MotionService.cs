// Services/MotionService.cs
using FitBot.Api.Data;
using FitBot.Api.DTOs;
using FitBot.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FitBot.Api.Services
{
    public class MotionService : IMotionService
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _http;
        private readonly IConfiguration _config;
        private readonly ILogger<MotionService> _logger;

        private string PythonUrl =>
            _config["PythonService:BaseUrl"] ?? "http://localhost:8000";

        public MotionService(AppDbContext context, IHttpClientFactory http,
            IConfiguration config, ILogger<MotionService> logger)
        {
            _context = context;
            _http = http;
            _config = config;
            _logger = logger;
        }

        public async Task<MotionPatternDto> GetOrProcessVideoAsync(
            int videoId, string youtubeUrl, string exerciseName)
        {
            // 1. Check if already processed — return cached result
            var existing = await _context.VideoMotionPatterns
                .FirstOrDefaultAsync(v => v.VideoId == videoId);

            if (existing != null)
            {
                _logger.LogInformation(
                    "Returning cached motion pattern for VideoId {Id}", videoId);
                return MapToDto(existing);
            }

            // 2. Not cached — call Python to process the YouTube video
            _logger.LogInformation(
                "Processing YouTube video {Url} for VideoId {Id}", youtubeUrl, videoId);

            var client = _http.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(10); // download + processing takes time

            var internalKey = _config["PythonService:InternalApiKey"];
            if (!string.IsNullOrWhiteSpace(internalKey))
                client.DefaultRequestHeaders.Add("X-Internal-Key", internalKey);

            var payload = JsonSerializer.Serialize(new
            {
                video_id = videoId,
                youtube_url = youtubeUrl,
                exercise_name = exerciseName,
                sample_rate = 5
            });

            var response = await client.PostAsync(
                $"{PythonUrl}/api/process-youtube",
                new StringContent(payload, System.Text.Encoding.UTF8, "application/json"));

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Python processing failed: {err}");
            }

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(json);

            // 3. Store in DB
            var record = new VideoMotionPattern
            {
                VideoId = videoId,
                ExerciseName = exerciseName,
                TotalFrames = result.GetProperty("total_frames").GetInt32(),
                Fps = result.GetProperty("fps").GetDouble(),
                FramesJson = result.GetProperty("frames").GetRawText(),
                MotionPatternJson = result.GetProperty("motion_pattern").GetRawText(),
                ProcessedAt = DateTime.UtcNow,
            };

            _context.VideoMotionPatterns.Add(record);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Stored motion pattern for VideoId {Id}, {Frames} frames",
                videoId, record.TotalFrames);

            return MapToDto(record);
        }

        private static MotionPatternDto MapToDto(VideoMotionPattern r) => new()
        {
            VideoId = r.VideoId,
            ExerciseName = r.ExerciseName,
            TotalFrames = r.TotalFrames,
            Fps = r.Fps,
            Frames = r.FramesJson,
            MotionPattern = r.MotionPatternJson,
            ProcessedAt = r.ProcessedAt,
        };
    }
}