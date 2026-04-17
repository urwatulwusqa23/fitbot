// DTOs/ChatRequestDto.cs
namespace FitBot.Api.DTOs
{
    public class ChatRequestDto
    {
        public string Message { get; set; } = string.Empty;
        public List<ChatHistoryItem> History { get; set; } = new();
        public object? UserProfile { get; set; } // optional, backend uses DB profile anyway
    }

    public class ChatHistoryItem
    {
        public string Role { get; set; } = string.Empty;   // "user" | "assistant"
        public string Content { get; set; } = string.Empty;
    }

    // DTOs/ChatRequestDto.cs — update ChatResponseDto:
    public class ChatResponseDto
    {
        public string Reply { get; set; } = string.Empty;
        public string Source { get; set; } = "ai";
        // NEW:
        public List<VideoResponseDto>? Videos { get; set; }
        public string? VideoMessage { get; set; }
    }
}