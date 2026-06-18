using System.ComponentModel.DataAnnotations;

namespace FitBot.Api.DTOs
{
    public class UserProfileDto
    {
        [Range(1, 120, ErrorMessage = "Age must be between 1 and 120.")]
        public int Age { get; set; }

        public string Gender { get; set; }

        [Range(50, 280, ErrorMessage = "Height must be between 50 and 280 cm.")]
        public float Height { get; set; }

        [Range(2, 500, ErrorMessage = "Weight must be between 2 and 500 kg.")]
        public float Weight { get; set; }

        public string HealthIssues { get; set; }

        [Range(0, 500, ErrorMessage = "Target weight must be between 0 and 500 kg.")]
        public float TargetWeight { get; set; }
    }
}
