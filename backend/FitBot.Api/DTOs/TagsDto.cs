namespace FitBot.Api.DTOs
{
    public class SynonymDto
    {
        public int? Id { get; set; }
        public string Keyword { get; set; } = string.Empty;
        // Accept "word1, word2" string from frontend
        public string Synonyms { get; set; } = string.Empty;
    }

    public class SynonymResponseDto
    {
        public int Id { get; set; }
        public string Keyword { get; set; } = string.Empty;
        public List<string> Synonyms { get; set; } = new();
        public bool IsNew { get; set; }
    }

    public class StopWordDto
    {
        public string Word { get; set; } = string.Empty;
    }

    public class StopWordResponseDto
    {
        public int Id { get; set; }
        public string Word { get; set; } = string.Empty;
    }

    public class TagsDataDto
    {
        public List<SynonymResponseDto> Synonyms { get; set; } = new();
        public List<StopWordResponseDto> Stopwords { get; set; } = new();
    }
}
