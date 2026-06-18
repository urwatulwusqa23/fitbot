using FitBot.Api.DTOs;
using FitBot.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;

        public AuthController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpPost("register")]
        public async Task<ActionResult> Register(UserDto request)
        {
            if (await _userService.ExistsByUsernameAsync(request.Username))
                return BadRequest("User already exists.");

            string email = request.Email ?? request.Username;
            await _userService.RegisterAsync(request.Username, email, request.Password);
            return Ok("User registered successfully!");
        }

        [HttpPost("login")]
        public async Task<ActionResult<object>> Login(UserDto request)
        {
            var loginInput = (request.Username ?? "").Trim();
            if (string.IsNullOrEmpty(loginInput))
                return BadRequest("Email or username is required.");

            var user = await _userService.GetByEmailOrUsernameAsync(loginInput);
            if (user == null)
                return BadRequest("User not found.");

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return BadRequest("Wrong password.");

            string token = await _userService.CreateJwtTokenAsync(user);
            bool hasProfile = user.Profile != null;

            return Ok(new { token, hasProfile });
        }

        [HttpPost("forgot-password")]
        public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest("Email is required.");

            bool sent = await _userService.ForgotPasswordAsync(request.Email.Trim());
            if (!sent)
                return Ok("If an account exists with this email, you will receive a password reset link.");
            return Ok("If an account exists with this email, you will receive a password reset link.");
        }

        [HttpPost("reset-password")]
        public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest("Token and new password are required.");

            bool success = await _userService.ResetPasswordAsync(request.Token, request.NewPassword);
            if (!success)
                return BadRequest("Invalid or expired reset token.");
            return Ok("Password has been reset successfully.");
        }

        [HttpPost("google")]
        public async Task<ActionResult<object>> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.IdToken))
                return BadRequest("Google ID token is required.");

            var result = await _userService.GoogleLoginAsync(request.IdToken);
            if (result == null)
                return BadRequest("Invalid or expired Google token.");

            return Ok(new { token = result.Value.token, hasProfile = result.Value.hasProfile });
        }
    }
}
