// Models/VideoMotionPattern.cs
namespace FitBot.Api.Models
{
    public class VideoMotionPattern
    {
        public int Id { get; set; }
        public int VideoId { get; set; }      // FK → Videos table
        public Video Video { get; set; } = null!;

        public string ExerciseName { get; set; } = string.Empty;
        public int TotalFrames { get; set; }
        public double Fps { get; set; }

        // Full per-frame data: [{frame_index, time_position, angles, keypoints}]
        // Stored as JSON string — queried by browser for comparison
        public string FramesJson { get; set; } = string.Empty;

        // Summary stats per angle (mean/std/min/max/sequence)
        // Used for quick threshold checks without loading all frames
        public string MotionPatternJson { get; set; } = string.Empty;

        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    }
}