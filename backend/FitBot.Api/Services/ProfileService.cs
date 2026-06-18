using FitBot.Api.Data;
using FitBot.Api.DTOs;
using FitBot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FitBot.Api.Services
{
    public class ProfileService : IProfileService
    {
        private readonly AppDbContext _context;

        public ProfileService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetUserByUsernameAsync(string username)
        {
            return await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<UserProfile?> GetProfileByUserIdAsync(int userId)
        {
            return await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);
        }

        public async Task<UserProfile> CreateOrUpdateProfileAsync(int userId, UserProfileDto request)
        {
            if (request.Height <= 0)
                throw new ArgumentException("Height must be valid.");

            float heightInMeters = request.Height / 100f;
            float bmi = request.Weight / (heightInMeters * heightInMeters);

            var user = await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                throw new InvalidOperationException("User not found.");

            if (user.Profile != null)
            {
                user.Profile.Age = request.Age;
                user.Profile.Gender = request.Gender;
                user.Profile.Height = request.Height;
                user.Profile.Weight = request.Weight;
                user.Profile.HealthIssues = request.HealthIssues;
                user.Profile.TargetWeight = request.TargetWeight;
                user.Profile.BmiValue = bmi;
                user.Profile.IsBmiFromAi = false;
            }
            else
            {
                var newProfile = new UserProfile
                {
                    UserId = userId,
                    Age = request.Age,
                    Gender = request.Gender,
                    Height = request.Height,
                    Weight = request.Weight,
                    HealthIssues = request.HealthIssues,
                    TargetWeight = request.TargetWeight,
                    BmiValue = bmi,
                    IsBmiFromAi = false
                };
                user.Profile = newProfile;
                _context.UserProfiles.Add(newProfile);
            }

            var log = new BmiLog
            {
                UserId = userId,
                Height = request.Height,
                Weight = request.Weight,
                BmiValue = bmi,
                DateRecorded = DateTime.UtcNow
            };
            _context.BmiLogs.Add(log);
            await _context.SaveChangesAsync();

            return user.Profile!;
        }

        public async Task<List<BmiLog>> GetBmiLogsByUserIdAsync(int userId)
        {
            return await _context.BmiLogs
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.DateRecorded)
                .ToListAsync();
        }

        public async Task<UserProfile?> UpdateProfileAsync(string username, UserProfileDto request)
        {
            var user = await _context.Users
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Username == username);
            if (user?.Profile == null)
                return null;

            float heightInMeters = request.Height / 100f;
            float bmi = request.Weight / (heightInMeters * heightInMeters);

            user.Profile.Age = request.Age;
            user.Profile.Gender = request.Gender;
            user.Profile.Height = request.Height;
            user.Profile.Weight = request.Weight;
            user.Profile.HealthIssues = request.HealthIssues;
            user.Profile.TargetWeight = request.TargetWeight;
            user.Profile.BmiValue = bmi;
            user.Profile.IsBmiFromAi = false;

            var log = new BmiLog
            {
                UserId = user.Id,
                Height = request.Height,
                Weight = request.Weight,
                BmiValue = bmi,
                DateRecorded = DateTime.UtcNow
            };
            _context.BmiLogs.Add(log);

            await _context.SaveChangesAsync();
            return user.Profile;
        }
    }
}
