// Models/ReferenceMotion.cs
namespace FitBot.Api.Models
{
    public class ReferenceMotion
    {
        public int Id { get; set; }
        public int VideoId { get; set; }           // FK → Videos table
        public Video Video { get; set; } = null!;

        public string ExerciseName { get; set; } = string.Empty;
        public int TotalFramesProcessed { get; set; }

        // Heavy data stored as JSON strings
        public string MotionPatternJson { get; set; } = string.Empty;  // mean/std/min/max per angle
        public string FramesDataJson { get; set; } = string.Empty;  // per-frame keypoints + angles

        public string VideoMetadataJson { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}