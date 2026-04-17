using FitBot.Api.Data;
using FitBot.Api.DTOs;
using FitBot.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FitBot.Api.Services
{
    public class VideoService : IVideoService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<VideoService> _logger;

        private string GetJsonPath(string fileName)
        {
            // Looks in the project root directory
            return Path.Combine(AppContext.BaseDirectory, fileName);
        }

        public VideoService(AppDbContext context, IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<VideoService> logger)
        {
            _context = context;
            _config = config;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        // ── Mapping helpers ──────────────────────────────────────────────────
        private static VideoResponseDto Map(Video v) => new()
        {
            Id = v.Id,
            Title = v.Title,
            Link = v.Link,
            Tags = v.Tags,
            CreatedAt = v.CreatedAt
        };

        private static SynonymResponseDto MapSyn(Synonym s) => new()
        {
            Id = s.Id,
            Keyword = s.Keyword,
            Synonyms = s.Synonyms,
            IsNew = s.IsNew
        };

        private static StopWordResponseDto MapSw(StopWord s) => new()
        { Id = s.Id, Word = s.Word };

        // ── CRUD Videos ──────────────────────────────────────────────────────
        public async Task<List<VideoResponseDto>> GetAllVideosAsync()
            => await _context.Videos.OrderByDescending(v => v.CreatedAt)
                .Select(v => new VideoResponseDto { Id = v.Id, Title = v.Title, Link = v.Link, Tags = v.Tags, CreatedAt = v.CreatedAt })
                .ToListAsync();

        public async Task<VideoResponseDto?> GetVideoByIdAsync(int id)
        {
            var v = await _context.Videos.FindAsync(id);
            return v == null ? null : Map(v);
        }

        public async Task<VideoResponseDto> CreateVideoAsync(VideoDto dto)
        {
            var v = new Video { Title = dto.Title, Link = dto.Link };
            v.Tags = dto.Tags;
            _context.Videos.Add(v);
            await _context.SaveChangesAsync();
            return Map(v);
        }

        public async Task<VideoResponseDto?> UpdateVideoAsync(int id, VideoDto dto)
        {
            var v = await _context.Videos.FindAsync(id);
            if (v == null) return null;
            v.Title = dto.Title;
            v.Link = dto.Link;
            v.Tags = dto.Tags;
            await _context.SaveChangesAsync();
            return Map(v);
        }

        public async Task<bool> DeleteVideoAsync(int id)
        {
            var v = await _context.Videos.FindAsync(id);
            if (v == null) return false;
            _context.Videos.Remove(v);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> SeedVideosAsync()
        {
            var path = GetJsonPath("videos.json");
            if (!File.Exists(path)) return 0;

            var json = await File.ReadAllTextAsync(path);
            var seedVideos = JsonSerializer.Deserialize<List<VideoDto>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (seedVideos == null) return 0;

            int added = 0;
            foreach (var dto in seedVideos)
            {
                if (!await _context.Videos.AnyAsync(v => v.Link == dto.Link))
                {
                    var v = new Video { Title = dto.Title, Link = dto.Link };
                    v.Tags = dto.Tags;
                    _context.Videos.Add(v);
                    added++;
                }
            }
            await _context.SaveChangesAsync();
            return added;
        }

        // ── Tags CRUD ────────────────────────────────────────────────────────
        public async Task<TagsDataDto> GetTagsDataAsync()
        {
            var synonyms = await _context.Synonyms
                .OrderByDescending(s => s.IsNew).ThenBy(s => s.Keyword)
                .ToListAsync();
            var stopwords = await _context.StopWords
                .OrderBy(s => s.Word).ToListAsync();
            return new TagsDataDto
            {
                Synonyms = synonyms.Select(MapSyn).ToList(),
                Stopwords = stopwords.Select(MapSw).ToList()
            };
        }

        public async Task<SynonymResponseDto> SaveSynonymAsync(SynonymDto dto)
        {
            var synList = dto.Synonyms.Split(',', StringSplitOptions.RemoveEmptyEntries)
                             .Select(s => s.Trim()).ToList();
            if (dto.Id.HasValue)
            {
                var existing = await _context.Synonyms.FindAsync(dto.Id.Value);
                if (existing != null)
                {
                    existing.Keyword = dto.Keyword;
                    existing.Synonyms = synList;
                    existing.IsNew = false;
                    await _context.SaveChangesAsync();
                    return MapSyn(existing);
                }
            }
            var s = new Synonym { Keyword = dto.Keyword, IsNew = false };
            s.Synonyms = synList;
            _context.Synonyms.Add(s);
            await _context.SaveChangesAsync();
            return MapSyn(s);
        }

        public async Task<bool> DeleteSynonymAsync(int id)
        {
            var s = await _context.Synonyms.FindAsync(id);
            if (s == null) return false;
            _context.Synonyms.Remove(s);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<StopWordResponseDto> SaveStopWordAsync(StopWordDto dto)
        {
            var word = dto.Word.Trim().ToLowerInvariant();
            var existing = await _context.StopWords.FirstOrDefaultAsync(s => s.Word == word);
            if (existing != null) return MapSw(existing);
            var sw = new StopWord { Word = word };
            _context.StopWords.Add(sw);
            await _context.SaveChangesAsync();
            return MapSw(sw);
        }

        public async Task<bool> DeleteStopWordAsync(int id)
        {
            var sw = await _context.StopWords.FindAsync(id);
            if (sw == null) return false;
            _context.StopWords.Remove(sw);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task SeedTagsAsync()
        {
            // ── Synonyms ──
            var synPath = GetJsonPath("synonyms.json");
            if (File.Exists(synPath))
            {
                var synJson = await File.ReadAllTextAsync(synPath);
                var seedSynonyms = JsonSerializer.Deserialize<List<SynonymSeedDto>>(synJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (seedSynonyms != null)
                {
                    foreach (var item in seedSynonyms)
                    {
                        if (!await _context.Synonyms.AnyAsync(s => s.Keyword == item.Keyword))
                        {
                            var s = new Synonym { Keyword = item.Keyword, IsNew = false };
                            s.Synonyms = item.Synonyms ?? new List<string>();
                            _context.Synonyms.Add(s);
                        }
                    }
                }
            }

            // ── Stopwords ──
            var swPath = GetJsonPath("stopwords.json");
            if (File.Exists(swPath))
            {
                var swJson = await File.ReadAllTextAsync(swPath);
                var seedStopWords = JsonSerializer.Deserialize<List<StopWordSeedDto>>(swJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (seedStopWords != null)
                {
                    foreach (var item in seedStopWords)
                    {
                        if (!await _context.StopWords.AnyAsync(s => s.Word == item.Word))
                            _context.StopWords.Add(new StopWord { Word = item.Word });
                    }
                }
            }

            await _context.SaveChangesAsync();
        }

        // ── Chat / NLP ───────────────────────────────────────────────────────
        public async Task<ChatVideoResponseDto> ProcessChatPromptAsync(string prompt)
        {
            var (searchQuery, tags) = await ExtractSearchQueryAsync(prompt);
            const int Limit = 4;

            // Score DB videos
            var allVideos = await _context.Videos.ToListAsync();
            var scored = allVideos.Select(v =>
            {
                int score = 0;
                var titleLower = v.Title.ToLowerInvariant();
                var firstWord = searchQuery.Split(' ')[0];
                if (titleLower.Contains(firstWord)) score += 50;
                foreach (var tag in tags)
                {
                    if (titleLower.Contains(tag)) score += 20;
                    if (v.Tags.Any(t => t.Contains(tag))) score += 15;
                }
                return (video: v, score);
            })
            .Where(x => x.score > 15)
            .OrderByDescending(x => x.score)
            .Take(Limit)
            .ToList();

            var recommended = scored.Select(x => Map(x.video)).ToList();
            var source = "database";

            // Fallback to YouTube API if not enough results
            if (recommended.Count < Limit)
            {
                var external = await FetchYouTubeAsync(searchQuery, Limit - recommended.Count + 1);
                if (external.Count > 0)
                {
                    source = recommended.Count > 0 ? "mixed" : "youtube";
                    foreach (var ext in external)
                    {
                        if (recommended.Count >= Limit) break;
                        var exists = await _context.Videos.AnyAsync(v => v.Link == ext.Link);
                        if (!exists)
                        {
                            var newV = new Video { Title = ext.Title, Link = ext.Link };
                            newV.Tags = tags;
                            _context.Videos.Add(newV);
                            await _context.SaveChangesAsync();
                            recommended.Add(Map(newV));
                        }
                    }
                }
            }

            return new ChatVideoResponseDto
            {
                Message = $"Found exercises for: {searchQuery.Replace(" workout", "")}",
                Videos = recommended,
                Source = source
            };
        }

        private async Task<(string searchQuery, List<string> tags)> ExtractSearchQueryAsync(string prompt)
        {
            var stopWords = (await _context.StopWords.ToListAsync())
                            .Select(s => s.Word.ToLowerInvariant()).ToHashSet();
            var synonymData = await _context.Synonyms.ToListAsync();

            var clean = new string(prompt.ToLowerInvariant()
                .Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray());
            var words = clean.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            var queryTerms = new List<string>();
            var expandedTags = new List<string>();
            var unknownWords = new List<string>();

            foreach (var w in words)
            {
                if (w.Length < 2 || stopWords.Contains(w)) continue;
                var mapped = synonymData.FirstOrDefault(s => s.Keyword == w);
                if (mapped != null)
                {
                    queryTerms.Add(mapped.Synonyms.FirstOrDefault() ?? w);
                    expandedTags.Add(w);
                    expandedTags.AddRange(mapped.Synonyms);
                }
                else
                {
                    queryTerms.Add(w);
                    expandedTags.Add(w);
                    unknownWords.Add(w);
                }
            }

            // Auto-learn unknown words via Datamuse
            foreach (var word in unknownWords)
            {
                if (!await _context.Synonyms.AnyAsync(s => s.Keyword == word))
                {
                    var onlineSyns = await FetchDatamuseAsync(word);
                    var s = new Synonym { Keyword = word, IsNew = true };
                    s.Synonyms = onlineSyns;
                    _context.Synonyms.Add(s);
                    expandedTags.AddRange(onlineSyns);
                }
            }
            await _context.SaveChangesAsync();

            var finalQuery = queryTerms.Count > 0
                ? string.Join(" ", queryTerms.Distinct()) + " workout"
                : "full body workout";

            return (finalQuery, expandedTags.Distinct().ToList());
        }

        private async Task<List<string>> FetchDatamuseAsync(string word)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                var url = $"https://api.datamuse.com/words?rel_syn={Uri.EscapeDataString(word)}&topics=fitness,exercise&max=6";
                var resp = await client.GetAsync(url);
                if (!resp.IsSuccessStatusCode) return new();
                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.EnumerateArray()
                    .Select(e => e.GetProperty("word").GetString() ?? "")
                    .Where(w => !string.IsNullOrEmpty(w))
                    .Take(6).ToList();
            }
            catch { return new(); }
        }

        private async Task<List<VideoDto>> FetchYouTubeAsync(string query, int limit)
        {
            var apiKey = _config["ApiKeys:YouTube"];
            if (string.IsNullOrEmpty(apiKey)) return new();
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                var url = $"https://www.googleapis.com/youtube/v3/search?part=snippet" +
                          $"&q={Uri.EscapeDataString(query)}&type=video&maxResults={limit}" +
                          $"&relevanceLanguage=en&key={apiKey}";
                var resp = await client.GetAsync(url);
                if (!resp.IsSuccessStatusCode) return new();
                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.GetProperty("items").EnumerateArray()
                    .Select(item => new VideoDto
                    {
                        Title = item.GetProperty("snippet").GetProperty("title").GetString() ?? "",
                        Link = $"https://www.youtube.com/watch?v={item.GetProperty("id").GetProperty("videoId").GetString()}",
                        Tags = new()
                    }).ToList();
            }
            catch { return new(); }
        }
    }
}