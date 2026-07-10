// Controllers/AdminController.cs
// ⚠️  Add this file to your FitBot.Api project.
// It exposes GET /api/admin/stats for the Admin Dashboard.
// Protect it with [Authorize(Roles = "Admin")] once you set the admin role in your DB.

using FitBot.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FitBot.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// GET /api/admin/stats
        /// Returns aggregated user statistics for the admin dashboard.
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalUsers = await _context.Users.CountAsync();

            var usersWithProfile = await _context.UserProfiles
                .Select(p => p.UserId)
                .Distinct()
                .CountAsync();

            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

            // NOTE: Add a CreatedAt field to your User model to enable this accurately.
            // For now this returns 0 until CreatedAt is tracked.
            int usersThisWeek = 0;
            // Once User.CreatedAt exists, replace with:
            // var usersThisWeek = await _context.Users
            //     .Where(u => u.CreatedAt >= oneWeekAgo)
            //     .CountAsync();

            return Ok(new
            {
                totalUsers,
                usersWithProfile,
                usersThisWeek
            });
        }

        /// <summary>
        /// GET /api/admin/users
        /// Returns a paginated list of users (page size 20).
        /// </summary>
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1)
        {
            const int pageSize = 20;
            var users = await _context.Users
                .Include(u => u.Profile)
                .OrderByDescending(u => u.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Role,
                    HasProfile = u.Profile != null,
                    BMI = u.Profile != null ? u.Profile.BmiValue : (float?)null
                })
                .ToListAsync();

            var total = await _context.Users.CountAsync();

            return Ok(new { users, total, page, pageSize });
        }
    }
}