namespace FitBot.Api.DTOs
{
    public class VideoDto
    {
        public string Title { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
    }

    public class VideoResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    public class ChatPromptDto
    {
        public string Prompt { get; set; } = string.Empty;
    }

    public class ChatVideoResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public List<VideoResponseDto> Videos { get; set; } = new();
        public string Source { get; set; } = "database";
    }
}
