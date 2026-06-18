// Services/IMotionService.cs
using FitBot.Api.DTOs;
namespace FitBot.Api.Services
{
    public interface IMotionService
    {
        Task<MotionPatternDto> GetOrProcessVideoAsync(int videoId, string youtubeUrl, string exerciseName);
    }
}