using FitBot.Api.DTOs;
using FitBot.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TagsController : ControllerBase
    {
        private readonly IVideoService _videoService;
        public TagsController(IVideoService videoService) => _videoService = videoService;

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _videoService.GetTagsDataAsync());

        [HttpPost("synonym")]
        [Authorize]
        public async Task<IActionResult> SaveSynonym([FromBody] SynonymDto dto) =>
            Ok(await _videoService.SaveSynonymAsync(dto));

        [HttpDelete("synonym/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSynonym(int id) =>
            await _videoService.DeleteSynonymAsync(id) ? Ok() : NotFound();

        [HttpPost("stopword")]
        [Authorize]
        public async Task<IActionResult> SaveStopWord([FromBody] StopWordDto dto) =>
            Ok(await _videoService.SaveStopWordAsync(dto));

        [HttpDelete("stopword/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteStopWord(int id) =>
            await _videoService.DeleteStopWordAsync(id) ? Ok() : NotFound();

        [HttpPost("seed")]
        [Authorize]
        public async Task<IActionResult> SeedTags()
        {
            await _videoService.SeedTagsAsync();
            return Ok(new { message = "Tags and stopwords seeded." });
        }
    }
}
