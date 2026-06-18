using FitBot.Api.Models;

namespace FitBot.Api.Services
{
    public interface IUserService
    {
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByEmailOrUsernameAsync(string emailOrUsername);
        Task<User?> GetByIdAsync(int id);
        Task<bool> ExistsByUsernameAsync(string username);
        Task<User> RegisterAsync(string username, string email, string password);
        Task<string> CreateJwtTokenAsync(User user);
        Task<(string token, bool hasProfile)?> GoogleLoginAsync(string idToken);
        Task<bool> ForgotPasswordAsync(string email);
        Task<bool> ResetPasswordAsync(string token, string newPassword);
    }
}
