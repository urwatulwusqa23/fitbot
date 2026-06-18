using System.ComponentModel.DataAnnotations.Schema;

namespace FitBot.Api.Models
{
    public class BmiLog
    {
        public int Id { get; set; }
        public float Height { get; set; }
        public float Weight { get; set; }
        public float BmiValue { get; set; }
        public DateTime DateRecorded { get; set; } = DateTime.UtcNow;

        // Link to User
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User User { get; set; }
    }
}
