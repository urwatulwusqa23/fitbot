using System.ComponentModel.DataAnnotations.Schema;

namespace FitBot.Api.Models
{
    public class UserProfile
    {
        public int Id { get; set; }

        public int Age { get; set; }
        public string Gender { get; set; } = string.Empty; // "Male", "Female"

        // BMI Data
        public float Height { get; set; } // in cm or meters
        public float Weight { get; set; } // in kg
        public float BmiValue { get; set; } // Calculated manually or by AI
        public bool IsBmiFromAi { get; set; } // To know if it was an image prediction

        // Medical Context
        

        // NEW FIELD FOR GOALS
        public float TargetWeight { get; set; }
        public string HealthIssues { get; set; } = string.Empty; // e.g., "Diabetes, Knee Pain"

        // Link back to User
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User User { get; set; }
    }
}
