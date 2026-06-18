// Models/User.cs
using System.Text.Json.Serialization;

namespace FitBot.Api.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiresAt { get; set; }

        [JsonIgnore]
        public UserProfile? Profile { get; set; }

        [JsonIgnore]
        public List<ChatMessage> ChatHistory { get; set; } = new();

        [JsonIgnore]
        public List<BmiLog> BmiLogs { get; set; } = new();

        [JsonIgnore]
        public List<ChatHistory> ChatHistories { get; set; } = new();

        [JsonIgnore]
        public List<DeepMemory> DeepMemories { get; set; } = new();

        [JsonIgnore]
        public List<DietPlan> DietPlans { get; set; } = new();

        [JsonIgnore]
        public List<ExercisePlan> ExercisePlans { get; set; } = new();

        [JsonIgnore]
        public List<LikedVideo> LikedVideos { get; set; } = new();
    }
}