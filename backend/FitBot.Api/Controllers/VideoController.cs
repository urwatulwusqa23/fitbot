using FitBot.Api.DTOs;
using FitBot.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VideoController : ControllerBase
    {
        private readonly IVideoService _videoService;
        public VideoController(IVideoService videoService) => _videoService = videoService;

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _videoService.GetAllVideosAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var v = await _videoService.GetVideoByIdAsync(id);
            return v == null ? NotFound() : Ok(v);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] VideoDto dto) =>
            Ok(await _videoService.CreateVideoAsync(dto));

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, [FromBody] VideoDto dto)
        {
            var v = await _videoService.UpdateVideoAsync(id, dto);
            return v == null ? NotFound() : Ok(v);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id) =>
            await _videoService.DeleteVideoAsync(id) ? Ok() : NotFound();

        [HttpPost("seed")]
        [Authorize]
        public async Task<IActionResult> Seed()
        {
            var count = await _videoService.SeedVideosAsync();
            return Ok(new { message = $"{count} videos seeded." });
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatPromptDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Prompt))
                return BadRequest("Prompt is required.");
            return Ok(await _videoService.ProcessChatPromptAsync(dto.Prompt));
        }
    }
}
