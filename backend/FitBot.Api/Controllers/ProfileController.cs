using FitBot.Api.DTOs;
using FitBot.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;

        public ProfileController(IProfileService profileService)
        {
            _profileService = profileService;
        }

        [HttpPost("onboarding")]
        [Authorize]
        public async Task<IActionResult> CompleteOnboarding(UserProfileDto request)
        {
            try
            {
                var username = User.FindFirst(ClaimTypes.Name)?.Value;
                if (string.IsNullOrEmpty(username))
                    return Unauthorized("User is not logged in properly.");

                var user = await _profileService.GetUserByUsernameAsync(username);
                if (user == null)
                    return Unauthorized("User not found.");

                if (request.Height <= 0)
                    return BadRequest("Height must be valid.");

                await _profileService.CreateOrUpdateProfileAsync(user.Id, request);
                return Ok(new { message = "Profile setup complete!" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR IN ONBOARDING: " + ex.Message);
                if (ex.InnerException != null)
                    Console.WriteLine("INNER ERROR: " + ex.InnerException.Message);
                return StatusCode(500, "Server Error: " + ex.Message);
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMyProfile()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            var user = await _profileService.GetUserByUsernameAsync(username);
            if (user == null)
                return Unauthorized();
            if (user.Profile == null)
                return NotFound("Profile not set up.");

            // Return profile fields + user identity fields so the frontend can
            // display the username and email on the profile page.
            return Ok(new
            {
                user.Profile.Id,
                user.Profile.Age,
                user.Profile.Gender,
                user.Profile.Height,
                user.Profile.Weight,
                user.Profile.BmiValue,
                user.Profile.IsBmiFromAi,
                user.Profile.TargetWeight,
                user.Profile.HealthIssues,
                username = user.Username,
                email    = user.Email,
            });
        }

        [HttpGet("bmi-logs")]
        [Authorize]
        public async Task<IActionResult> GetBmiLogs()
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            var user = await _profileService.GetUserByUsernameAsync(username);
            if (user == null)
                return Unauthorized();

            var logs = await _profileService.GetBmiLogsByUserIdAsync(user.Id);
            return Ok(logs);
        }

        [HttpPut("update")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UserProfileDto request)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized();

            var profile = await _profileService.UpdateProfileAsync(username, request);
            if (profile == null)
                return BadRequest("Profile does not exist.");

            return Ok(profile);
        }
    }
}
