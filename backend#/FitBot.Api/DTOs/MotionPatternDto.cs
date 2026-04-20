// DTOs/MotionPatternDto.cs
namespace FitBot.Api.DTOs
{
    public class MotionPatternDto
    {
        public int VideoId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        public int TotalFrames { get; set; }
        public double Fps { get; set; }
        public string Frames { get; set; } = string.Empty;
        public string MotionPattern { get; set; } = string.Empty;
        public DateTime ProcessedAt { get; set; }
    }

    public class AnalyzeVideoRequest
    {
        public int VideoId { get; set; }
        public string YoutubeUrl { get; set; } = string.Empty;
        public string ExerciseName { get; set; } = string.Empty;
    }
}