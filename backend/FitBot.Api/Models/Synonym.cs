namespace FitBot.Api.Models
{
    public class Synonym
    {
        public int Id { get; set; }
        public string Keyword { get; set; } = string.Empty;
        // Comma-separated list
        public string SynonymsRaw { get; set; } = string.Empty;
        public bool IsNew { get; set; } = false;

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public List<string> Synonyms
        {
            get => string.IsNullOrEmpty(SynonymsRaw)
                ? new List<string>()
                : SynonymsRaw.Split(',', System.StringSplitOptions.RemoveEmptyEntries)
                             .Select(s => s.Trim()).ToList();
            set => SynonymsRaw = string.Join(",", value ?? new List<string>());
        }
    }
}
