using System.Text.Json.Serialization;

namespace FitBot.Api.DTOs
{
    public class GoogleLoginRequest
    {
        [JsonPropertyName("idToken")]
        public string IdToken { get; set; } = string.Empty;
    }
}
