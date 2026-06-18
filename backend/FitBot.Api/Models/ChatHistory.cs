namespace FitBot.Api.Models
{
    public class ChatHistory
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string SessionId { get; set; } = "";
        public string Role { get; set; } = "";   // "user" or "assistant"
        public string Content { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public User? User { get; set; }
    }
}