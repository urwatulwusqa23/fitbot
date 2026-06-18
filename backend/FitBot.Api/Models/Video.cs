namespace FitBot.Api.Models
{
    public class Video
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
        // Stored as comma-separated in DB, serialized as array
        public string TagsRaw { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public List<string> Tags
        {
            get => string.IsNullOrEmpty(TagsRaw)
                ? new List<string>()
                : TagsRaw.Split(',', System.StringSplitOptions.RemoveEmptyEntries)
                         .Select(t => t.Trim()).ToList();
            set => TagsRaw = string.Join(",", value ?? new List<string>());
        }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
