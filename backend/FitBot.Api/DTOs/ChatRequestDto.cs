namespace FitBot.Api.DTOs
{
    public class ChatRequestDto
    {
        public string Message { get; set; } = string.Empty;
        public List<ChatHistoryItem> History { get; set; } = new();
        public object? UserProfile { get; set; }
        public string? SessionId { get; set; }  // ← ADD THIS
    }

    public class ChatHistoryItem
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class ChatResponseDto
    {
        public string Reply { get; set; } = string.Empty;
        public string Source { get; set; } = "ai";
        public List<VideoResponseDto>? Videos { get; set; }
        public string? VideoMessage { get; set; }
        public string? PlanType { get; set; }
    }

    public class SavePlanDto
    {
        public string Title { get; set; } = "";
        public string PlanType { get; set; } = "";
        public string PlanJson { get; set; } = "";
    }

    public class LikeVideoDto
    {
        public string VideoId { get; set; } = "";
        public string? Title { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? YoutubeUrl { get; set; }
    }

    public class DeepMemoryDto
    {
        public string Key { get; set; } = "";
        public string? Value { get; set; }
        public string? Category { get; set; }
    }
}