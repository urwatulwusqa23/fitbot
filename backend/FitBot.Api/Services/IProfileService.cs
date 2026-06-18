using FitBot.Api.DTOs;
using FitBot.Api.Models;

namespace FitBot.Api.Services
{
    public interface IProfileService
    {
        Task<User?> GetUserByUsernameAsync(string username);
        Task<UserProfile?> GetProfileByUserIdAsync(int userId);
        Task<UserProfile> CreateOrUpdateProfileAsync(int userId, UserProfileDto request);
        Task<List<BmiLog>> GetBmiLogsByUserIdAsync(int userId);
        Task<UserProfile?> UpdateProfileAsync(string username, UserProfileDto request);
    }
}
