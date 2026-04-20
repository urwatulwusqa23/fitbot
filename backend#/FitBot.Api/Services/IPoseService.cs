// Services/IPoseService.cs
using FitBot.Api.DTOs;

namespace FitBot.Api.Services
{
    public interface IPoseService
    {
        Task<ReferenceMotionResponseDto> ProcessReferenceVideoAsync(
            int videoId, string videoPath, string exerciseName, int sampleRate = 5);

        Task<ReferenceMotionResponseDto?> GetReferenceMotionByVideoIdAsync(int videoId);
        Task<List<ReferenceMotionResponseDto>> GetAllReferenceMotionsAsync();
        Task<bool> DeleteReferenceMotionAsync(int id);
    }
}