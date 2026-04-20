using FitBot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FitBot.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<ChatMessage> ChatHistory { get; set; }
        public DbSet<BmiLog> BmiLogs { get; set; }
        public DbSet<Video> Videos { get; set; }
        public DbSet<Synonym> Synonyms { get; set; }
        public DbSet<StopWord> StopWords { get; set; }
        public DbSet<ReferenceMotion> ReferenceMotions { get; set; }
        public DbSet<VideoMotionPattern> VideoMotionPatterns { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasOne(u => u.Profile)
                .WithOne(p => p.User)
                .HasForeignKey<UserProfile>(p => p.UserId);
        }
    }
}
