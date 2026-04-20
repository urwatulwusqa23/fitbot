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
        //public async Task<ChatVideoResponseDto> ProcessChatPromptAsync(string prompt)
        //{
        //    var (searchQuery, tags) = await ExtractSearchQueryAsync(prompt);
        //    const int Limit = 4;

        //    // Score DB videos — but ONLY match videos whose tags
        //    // actually contain the first keyword of the search query.
        //    // This prevents "shoulder" videos appearing for "squat" searches.
        //    var allVideos = await _context.Videos.ToListAsync();
        //    var primaryKeyword = tags.FirstOrDefault() ?? searchQuery.Split(' ')[0];

        //    var scored = allVideos.Select(v =>
        //    {
        //        int score = 0;
        //        var titleLower = v.Title.ToLowerInvariant();
        //        var tagsLower = v.Tags.Select(t => t.ToLowerInvariant()).ToList();

        //        // Primary keyword MUST appear in title or tags — otherwise score stays 0
        //        bool primaryMatch = titleLower.Contains(primaryKeyword)
        //            || tagsLower.Any(t => t.Contains(primaryKeyword));

        //        if (!primaryMatch) return (video: v, score: 0);

        //        // Title contains the primary keyword → high score
        //        if (titleLower.Contains(primaryKeyword)) score += 60;

        //        // Additional tag matches
        //        foreach (var tag in tags.Skip(1).Take(5))
        //        {
        //            if (titleLower.Contains(tag)) score += 15;
        //            if (tagsLower.Any(t => t.Contains(tag))) score += 10;
        //        }

        //        return (video: v, score);
        //    })
        //    .Where(x => x.score > 0)
        //    .OrderByDescending(x => x.score)
        //    .Take(Limit)
        //    .ToList();

        //    var recommended = scored.Select(x => Map(x.video)).ToList();
        //    var source = "database";

        //    // Always fetch fresh from YouTube if DB results < Limit
        //    if (recommended.Count < Limit)
        //    {
        //        var needed = Limit - recommended.Count;
        //        var external = await FetchYouTubeAsync(searchQuery, needed + 2);

        //        if (external.Count > 0)
        //        {
        //            source = recommended.Count > 0 ? "mixed" : "youtube";

        //            foreach (var ext in external)
        //            {
        //                if (recommended.Count >= Limit) break;

        //                // Skip if already in recommended list
        //                if (recommended.Any(r => r.Link == ext.Link)) continue;

        //                var exists = await _context.Videos
        //                    .AnyAsync(v => v.Link == ext.Link);

        //                if (!exists)
        //                {
        //                    var newV = new Video
        //                    {
        //                        Title = ext.Title,
        //                        Link = ext.Link,
        //                    };
        //                    // Tag with the actual search terms not generic ones
        //                    newV.Tags = tags.Take(5).ToList();
        //                    _context.Videos.Add(newV);
        //                    await _context.SaveChangesAsync();
        //                    recommended.Add(Map(newV));
        //                }
        //                else
        //                {
        //                    // Already in DB but not in scored list — add it
        //                    var existing = await _context.Videos
        //                        .FirstOrDefaultAsync(v => v.Link == ext.Link);
        //                    if (existing != null && recommended.Count < Limit)
        //                        recommended.Add(Map(existing));
        //                }
        //            }
        //        }
        //    }

        //    var exerciseName = primaryKeyword.Length > 0
        //        ? char.ToUpper(primaryKeyword[0]) + primaryKeyword.Substring(1)
        //        : searchQuery;

        //    return new ChatVideoResponseDto
        //    {
        //        Message = $"Here are {recommended.Count} videos for: {exerciseName}",
        //        Videos = recommended,
        //        Source = source
        //    };
        //}


        public async Task<ChatVideoResponseDto> ProcessChatPromptAsync(string prompt)
        {
            var (searchQuery, tags, primaryKeyword) = await ExtractSearchQueryAsync(prompt);
            const int Limit = 4;

            _logger.LogInformation(
                "Searching for: '{Query}' | Primary keyword: '{Primary}' | Tags: {Tags}",
                searchQuery, primaryKeyword, string.Join(", ", tags));

            // ── Score DB videos ───────────────────────────────────────────────────
            var allVideos = await _context.Videos.ToListAsync();

            var scored = allVideos.Select(v =>
            {
                var titleLower = v.Title.ToLowerInvariant();
                var tagsLower = v.Tags.Select(t => t.ToLowerInvariant()).ToList();

                // PRIMARY KEYWORD MUST MATCH title or tags
                // If it does not match — score is 0, video is excluded
                bool primaryInTitle = titleLower.Contains(primaryKeyword);
                bool primaryInTags = tagsLower.Any(t => t.Contains(primaryKeyword));

                if (!primaryInTitle && !primaryInTags)
                    return (video: v, score: 0);

                int score = 0;
                if (primaryInTitle) score += 80;  // strong signal
                if (primaryInTags) score += 40;

                // Secondary tag matches add bonus points
                foreach (var tag in tags.Where(t => t != primaryKeyword).Take(4))
                {
                    if (titleLower.Contains(tag)) score += 15;
                    if (tagsLower.Any(t => t.Contains(tag))) score += 8;
                }

                return (video: v, score);
            })
            .Where(x => x.score > 0)
            .OrderByDescending(x => x.score)
            .Take(Limit)
            .ToList();

            var recommended = scored.Select(x => Map(x.video)).ToList();
            var source = "database";

            _logger.LogInformation(
                "Found {Count} matching videos in DB for '{Keyword}'",
                recommended.Count, primaryKeyword);

            // ── YouTube fallback if not enough DB results ─────────────────────────
            if (recommended.Count < Limit)
            {
                _logger.LogInformation(
                    "Fetching from YouTube: '{Query}'", searchQuery);

                var external = await FetchYouTubeAsync(
                    searchQuery, Limit - recommended.Count + 2);

                if (external.Count > 0)
                {
                    source = recommended.Count > 0 ? "mixed" : "youtube";

                    foreach (var ext in external)
                    {
                        if (recommended.Count >= Limit) break;
                        if (recommended.Any(r => r.Link == ext.Link)) continue;

                        var exists = await _context.Videos
                            .AnyAsync(v => v.Link == ext.Link);

                        if (!exists)
                        {
                            var newV = new Video
                            {
                                Title = ext.Title,
                                Link = ext.Link,
                            };
                            // Tag with ONLY the actual search terms
                            newV.Tags = tags.Take(4).ToList();
                            _context.Videos.Add(newV);
                            await _context.SaveChangesAsync();
                            recommended.Add(Map(newV));
                        }
                    }
                }
            }

            return new ChatVideoResponseDto
            {
                Message = $"Found {recommended.Count} videos for: {primaryKeyword}",
                Videos = recommended,
                Source = source
            };
        }

        // ── Return primary keyword as third value ─────────────────────────────────
        private async Task<(string searchQuery, List<string> tags, string primaryKeyword)>
            ExtractSearchQueryAsync(string prompt)
        {
            var stopWords = (await _context.StopWords.ToListAsync())
                            .Select(s => s.Word.ToLowerInvariant()).ToHashSet();

            // Extend stop words with common non-exercise words
            // so "show me some feet exercises" correctly extracts "feet"
            var extraStops = new[]
            {
        "show","give","me","some","please","want","need","help",
        "find","get","do","can","video","videos","exercise","exercises",
        "workout","workouts","good","best","how","what","my","for",
        "the","an","to","is","are","was","with","and","or","about",
        "have","has","let","see","watch","learn","teach","tell"
    };
            foreach (var w in extraStops) stopWords.Add(w);

            var synonymData = await _context.Synonyms.ToListAsync();

            var clean = new string(prompt.ToLowerInvariant()
                .Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray());

            var words = clean
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length > 2 && !stopWords.Contains(w))
                .ToList();

            _logger.LogInformation(
                "Extracted words after stop filter: {Words}",
                string.Join(", ", words));

            var queryTerms = new List<string>();
            var expandedTags = new List<string>();
            var unknownWords = new List<string>();

            foreach (var w in words)
            {
                var mapped = synonymData.FirstOrDefault(s =>
                    s.Keyword.Equals(w, StringComparison.OrdinalIgnoreCase));

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

            // Auto-learn unknown words — limit to 2 API calls max
            foreach (var word in unknownWords.Take(2))
            {
                if (!await _context.Synonyms.AnyAsync(s => s.Keyword == word))
                {
                    var syns = await FetchDatamuseAsync(word);
                    if (syns.Count > 0)
                    {
                        var s = new Synonym { Keyword = word, IsNew = true };
                        s.Synonyms = syns;
                        _context.Synonyms.Add(s);
                        expandedTags.AddRange(syns);
                    }
                }
            }
            await _context.SaveChangesAsync();

            // Primary keyword = first meaningful word extracted
            var primaryKeyword = queryTerms.FirstOrDefault() ?? words.FirstOrDefault() ?? "fitness";

            // YouTube search uses primary keyword explicitly
            var finalQuery = $"{primaryKeyword} exercise tutorial";

            return (finalQuery, expandedTags.Distinct().ToList(), primaryKeyword);
        }

        private async Task<List<string>> FetchDatamuseAsync(string word)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                var url = $"https://api.datamuse.com/words?rel_syn={Uri.EscapeDataString(word)}" +
                          $"&topics=fitness,exercise&max=5";
                var resp = await client.GetAsync(url);
                if (!resp.IsSuccessStatusCode) return new();
                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.EnumerateArray()
                    .Select(e => e.GetProperty("word").GetString() ?? "")
                    .Where(w => !string.IsNullOrEmpty(w))
                    .Take(5).ToList();
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
                        Title = item.GetProperty("snippet")
                                    .GetProperty("title").GetString() ?? "",
                        Link = $"https://www.youtube.com/watch?v=" +
                                item.GetProperty("id")
                                    .GetProperty("videoId").GetString(),
                        Tags = new()
                    }).ToList();
            }
            catch { return new(); }
        }

        //private async Task<(string searchQuery, List<string> tags)> ExtractSearchQueryAsync(string prompt)
        //{
        //    var stopWords = (await _context.StopWords.ToListAsync())
        //                    .Select(s => s.Word.ToLowerInvariant()).ToHashSet();
        //    var synonymData = await _context.Synonyms.ToListAsync();

        //    var clean = new string(prompt.ToLowerInvariant()
        //        .Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray());
        //    var words = clean.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        //    var queryTerms = new List<string>();
        //    var expandedTags = new List<string>();
        //    var unknownWords = new List<string>();

        //    foreach (var w in words)
        //    {
        //        if (w.Length < 2 || stopWords.Contains(w)) continue;
        //        var mapped = synonymData.FirstOrDefault(s => s.Keyword == w);
        //        if (mapped != null)
        //        {
        //            queryTerms.Add(mapped.Synonyms.FirstOrDefault() ?? w);
        //            expandedTags.Add(w);
        //            expandedTags.AddRange(mapped.Synonyms);
        //        }
        //        else
        //        {
        //            queryTerms.Add(w);
        //            expandedTags.Add(w);
        //            unknownWords.Add(w);
        //        }
        //    }

        //    // Auto-learn unknown words via Datamuse
        //    foreach (var word in unknownWords)
        //    {
        //        if (!await _context.Synonyms.AnyAsync(s => s.Keyword == word))
        //        {
        //            var onlineSyns = await FetchDatamuseAsync(word);
        //            var s = new Synonym { Keyword = word, IsNew = true };
        //            s.Synonyms = onlineSyns;
        //            _context.Synonyms.Add(s);
        //            expandedTags.AddRange(onlineSyns);
        //        }
        //    }
        //    await _context.SaveChangesAsync();

        //    var finalQuery = queryTerms.Count > 0
        //        ? string.Join(" ", queryTerms.Distinct()) + " workout"
        //        : "full body workout";

        //    return (finalQuery, expandedTags.Distinct().ToList());
        //}

        //private async Task<List<string>> FetchDatamuseAsync(string word)
        //{
        //    try
        //    {
        //        var client = _httpClientFactory.CreateClient();
        //        client.Timeout = TimeSpan.FromSeconds(5);
        //        var url = $"https://api.datamuse.com/words?rel_syn={Uri.EscapeDataString(word)}&topics=fitness,exercise&max=6";
        //        var resp = await client.GetAsync(url);
        //        if (!resp.IsSuccessStatusCode) return new();
        //        var json = await resp.Content.ReadAsStringAsync();
        //        using var doc = JsonDocument.Parse(json);
        //        return doc.RootElement.EnumerateArray()
        //            .Select(e => e.GetProperty("word").GetString() ?? "")
        //            .Where(w => !string.IsNullOrEmpty(w))
        //            .Take(6).ToList();
        //    }
        //    catch { return new(); }
        //}

        //private async Task<List<VideoDto>> FetchYouTubeAsync(string query, int limit)
        //{
        //    var apiKey = _config["ApiKeys:YouTube"];
        //    if (string.IsNullOrEmpty(apiKey)) return new();
        //    try
        //    {
        //        var client = _httpClientFactory.CreateClient();
        //        client.Timeout = TimeSpan.FromSeconds(10);
        //        var url = $"https://www.googleapis.com/youtube/v3/search?part=snippet" +
        //                  $"&q={Uri.EscapeDataString(query)}&type=video&maxResults={limit}" +
        //                  $"&relevanceLanguage=en&key={apiKey}";
        //        var resp = await client.GetAsync(url);
        //        if (!resp.IsSuccessStatusCode) return new();
        //        var json = await resp.Content.ReadAsStringAsync();
        //        using var doc = JsonDocument.Parse(json);
        //        return doc.RootElement.GetProperty("items").EnumerateArray()
        //            .Select(item => new VideoDto
        //            {
        //                Title = item.GetProperty("snippet").GetProperty("title").GetString() ?? "",
        //                Link = $"https://www.youtube.com/watch?v={item.GetProperty("id").GetProperty("videoId").GetString()}",
        //                Tags = new()
        //            }).ToList();
        //    }
        //    catch { return new(); }
        //}
    }
}