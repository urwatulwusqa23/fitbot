// Controllers/PoseController.cs
using FitBot.Api.DTOs;
using FitBot.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PoseController : ControllerBase
    {
        private readonly IPoseService _poseService;
        private readonly ILogger<PoseController> _logger;

        // Temp folder for uploaded videos
        private static readonly string TempFolder =
            Path.Combine(Path.GetTempPath(), "fitbot_videos");

        public PoseController(IPoseService poseService, ILogger<PoseController> logger)
        {
            _poseService = poseService;
            _logger = logger;
            Directory.CreateDirectory(TempFolder);
        }

        // POST /api/pose/process
        // Client sends: multipart form with video file + exercise name
        [HttpPost("process")]
        public async Task<IActionResult> ProcessVideo(
            [FromForm] VideoUploadDto dto,
            IFormFile videoFile)
        {
            if (videoFile == null || videoFile.Length == 0)
                return BadRequest(new { error = "Video file is required." });

            var allowedExtensions = new[] { ".mp4", ".avi", ".mov", ".mkv", ".webm" };
            var ext = Path.GetExtension(videoFile.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { error = $"Unsupported format. Allowed: {string.Join(", ", allowedExtensions)}" });

            if (videoFile.Length > 100 * 1024 * 1024)  // 100 MB limit
                return BadRequest(new { error = "File too large. Max 100 MB." });

            // Save to temp path
            var fileName = $"{Guid.NewGuid()}{ext}";
            var tempPath = Path.Combine(TempFolder, fileName);

            try
            {
                await using (var stream = System.IO.File.Create(tempPath))
                    await videoFile.CopyToAsync(stream);

                // Use VideoId = 0 for user-uploaded references (no DB video record)
                // or pass a real VideoId if you create a Video record first
                var videoId = Math.Abs(dto.ExerciseName.GetHashCode() ^ fileName.GetHashCode()); ;

                var result = await _poseService.ProcessReferenceVideoAsync(
                    videoId: videoId,
                    videoPath: tempPath,
                    exerciseName: dto.ExerciseName,
                    sampleRate: dto.SampleRate);

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return UnprocessableEntity(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing uploaded video");
                return StatusCode(500, new { error = "Processing failed. Please try again." });
            }
            finally
            {
                // Always clean up temp file
                if (System.IO.File.Exists(tempPath))
                    System.IO.File.Delete(tempPath);
            }
        }

        // GET /api/pose/reference/{videoId}
        [HttpGet("reference/{videoId}")]
        public async Task<IActionResult> GetReferenceMotion(int videoId)
        {
            var result = await _poseService.GetReferenceMotionByVideoIdAsync(videoId);
            return result == null ? NotFound(new { error = "No pose data found for this video." }) : Ok(result);
        }

        // GET /api/pose/all
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
            => Ok(await _poseService.GetAllReferenceMotionsAsync());

        // DELETE /api/pose/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
            => await _poseService.DeleteReferenceMotionAsync(id)
                ? Ok(new { message = "Deleted." })
                : NotFound();
    }
}