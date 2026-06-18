namespace FitBot.Api.Models
{
    public class DeepMemory
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string MemoryKey { get; set; } = "";
        public string MemoryValue { get; set; } = "";
        public string? Category { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public User? User { get; set; }
    }
}