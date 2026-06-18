// DTOs/SeedDtos.cs
namespace FitBot.Api.DTOs
{
    public class SynonymSeedDto
    {
        public string Keyword { get; set; } = string.Empty;
        public List<string> Synonyms { get; set; } = new();
        public bool IsNew { get; set; } = false;
    }

    public class StopWordSeedDto
    {
        public string Word { get; set; } = string.Empty;
    }
}