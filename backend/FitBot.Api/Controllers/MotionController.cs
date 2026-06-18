// Controllers/MotionController.cs
using FitBot.Api.DTOs;
using FitBot.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MotionController : ControllerBase
    {
        private readonly IMotionService _motionService;

        public MotionController(IMotionService motionService)
            => _motionService = motionService;

        // GET /api/motion/pattern/5
        // React calls this first — gets cached pattern if exists
        [HttpGet("pattern/{videoId}")]
        public async Task<IActionResult> GetPattern(int videoId)
        {
            // Return 404 if not processed yet — React will then call /analyze
            return NotFound(new { message = "Not processed yet" });
        }

        // POST /api/motion/analyze
        // React calls this to trigger YouTube download + processing
        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze([FromBody] AnalyzeVideoRequest req)
        {
            try
            {
                var result = await _motionService.GetOrProcessVideoAsync(
                    req.VideoId, req.YoutubeUrl, req.ExerciseName);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}