using FitBot.Api.Data;
using FitBot.Api.Models;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace FitBot.Api.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public UserService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<User?> GetByEmailOrUsernameAsync(string emailOrUsername)
        {
            if (string.IsNullOrWhiteSpace(emailOrUsername)) return null;
            var normalized = emailOrUsername.Trim().ToLowerInvariant();
            return await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u =>
                    u.Email.ToLower() == normalized ||
                    u.Username.ToLower() == normalized);
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<bool> ExistsByUsernameAsync(string username)
        {
            return await _context.Users.AnyAsync(u => u.Username == username);
        }

        public async Task<User> RegisterAsync(string username, string email, string password)
        {
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
            var user = new User
            {
                Username = username?.Trim() ?? "",
                Email = (email ?? username ?? "").Trim().ToLowerInvariant(),
                PasswordHash = passwordHash
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<string> CreateJwtTokenAsync(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration.GetSection("Jwt:Key").Value!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<(string token, bool hasProfile)?> GoogleLoginAsync(string idToken)
        {
            GoogleJsonWebSignature.Payload? payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings();
                var googleClientId = _configuration["Google:ClientId"];
                if (!string.IsNullOrWhiteSpace(googleClientId))
                {
                    settings.Audience = new[] { googleClientId };
                }
                payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            }
            catch
            {
                return null;
            }

            if (payload?.Email == null)
                return null;

            string email = payload.Email;
            string name = payload.Name ?? payload.Email.Split('@')[0];
            string username = await MakeUniqueUsername(name, email);

            var user = await GetByEmailAsync(email);
            if (user == null)
            {
                string passwordHash = BCrypt.Net.BCrypt.HashPassword(
                    Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
                user = new User
                {
                    Username = username,
                    Email = email,
                    PasswordHash = passwordHash
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                user = await GetByEmailAsync(email);
            }

            if (user == null)
                return null;

            string token = await CreateJwtTokenAsync(user);
            bool hasProfile = user.Profile != null;
            return (token, hasProfile);
        }

        private async Task<string> MakeUniqueUsername(string baseName, string email)
        {
            string username = SanitizeUsername(baseName);
            if (string.IsNullOrEmpty(username))
                username = email.Split('@')[0];
            string candidate = username;
            int suffix = 0;
            while (await ExistsByUsernameAsync(candidate))
                candidate = $"{username}{++suffix}";
            return candidate;
        }

        private static string SanitizeUsername(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return string.Empty;
            var allowed = new HashSet<char>("abcdefghijklmnopqrstuvwxyz0123456789_");
            return new string(s.ToLowerInvariant().Where(c => allowed.Contains(c)).ToArray());
        }

        public async Task<bool> ForgotPasswordAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                return false;

            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            user.PasswordResetToken = token;
            user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(1);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ResetPasswordAsync(string token, string newPassword)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.PasswordResetToken == token &&
                u.PasswordResetTokenExpiresAt.HasValue &&
                u.PasswordResetTokenExpiresAt.Value > DateTime.UtcNow);

            if (user == null)
                return false;

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiresAt = null;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
