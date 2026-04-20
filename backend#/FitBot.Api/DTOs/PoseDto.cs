// DTOs/PoseDto.cs
namespace FitBot.Api.DTOs
{
    // .NET calls Python with this
    public class PoseProcessRequestDto
    {
        public int VideoId { get; set; }
        public string VideoPath { get; set; } = string.Empty;  // temp path after upload
        public string ExerciseName { get; set; } = string.Empty;
        public int SampleRate { get; set; } = 5;
    }

    // Python returns this to .NET
    public class PoseProcessResponseDto
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public int TotalFramesProcessed { get; set; }
        public object? MotionPattern { get; set; }  // deserialized from JSON
        public string? VideoMetadata { get; set; }
    }

    // Client uploads this
    public class VideoUploadDto
    {
        public string ExerciseName { get; set; } = string.Empty;
        public int SampleRate { get; set; } = 5;
    }

    // Response to client
    public class ReferenceMotionResponseDto
    {
        public int Id { get; set; }
        public int VideoId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        public int TotalFramesProcessed { get; set; }
        public object? MotionPattern { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}