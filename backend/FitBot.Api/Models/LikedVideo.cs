namespace FitBot.Api.Models
{
    public class LikedVideo
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string VideoId { get; set; } = "";
        public string Title { get; set; } = "";
        public string? ThumbnailUrl { get; set; }
        public string YoutubeUrl { get; set; } = "";
        public DateTime LikedAt { get; set; } = DateTime.UtcNow;
        public User? User { get; set; }
    }
}