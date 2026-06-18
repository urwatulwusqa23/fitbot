// Services/IChatService.cs
using FitBot.Api.DTOs;
using FitBot.Api.Models;

namespace FitBot.Api.Services
{
    public interface IChatService
    {
        Task<ChatResponseDto> GetAiResponseAsync(
            string message,
            List<ChatHistoryItem> history,
            UserProfile? profile,
            IEnumerable<DeepMemory>? memory = null);

        Task<List<object>> GetHistoryAsync(int userId);
    }
}