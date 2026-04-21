// Data/AppDbContext.cs
using FitBot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FitBot.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // ── Existing tables ───────────────────────────────────────────────────
        public DbSet<User> Users { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<BmiLog> BmiLogs { get; set; }
        public DbSet<Video> Videos { get; set; }
        public DbSet<Synonym> Synonyms { get; set; }
        public DbSet<StopWord> StopWords { get; set; }
        public DbSet<ReferenceMotion> ReferenceMotions { get; set; }
        public DbSet<VideoMotionPattern> VideoMotionPatterns { get; set; }

        // ── New tables ────────────────────────────────────────────────────────
        public DbSet<ChatHistory> ChatHistories { get; set; }
        public DbSet<DeepMemory> DeepMemories { get; set; }
        public DbSet<DietPlan> DietPlans { get; set; }
        public DbSet<ExercisePlan> ExercisePlans { get; set; }
        public DbSet<LikedVideo> LikedVideos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Map ChatMessage model to the existing "ChatHistory" table in DB
            // so your existing data is NOT lost
            modelBuilder.Entity<ChatMessage>()
                .ToTable("ChatHistory");

            // User - Profile one-to-one
            modelBuilder.Entity<User>()
                .HasOne(u => u.Profile)
                .WithOne(p => p.User)
                .HasForeignKey<UserProfile>(p => p.UserId);

            // User - ChatMessage (old messages)
            modelBuilder.Entity<User>()
                .HasMany(u => u.ChatHistory)
                .WithOne(c => c.User)
                .HasForeignKey(c => c.UserId);

            // User - ChatHistory (new session-based history)
            modelBuilder.Entity<User>()
                .HasMany(u => u.ChatHistories)
                .WithOne(c => c.User)
                .HasForeignKey(c => c.UserId);

            // Unique: one memory key per user
            modelBuilder.Entity<DeepMemory>()
                .HasIndex(m => new { m.UserId, m.MemoryKey })
                .IsUnique();

            // Unique: one liked video per user
            modelBuilder.Entity<LikedVideo>()
                .HasIndex(v => new { v.UserId, v.VideoId })
                .IsUnique();

            // Default values
            modelBuilder.Entity<ChatHistory>()
                .Property(c => c.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<DeepMemory>()
                .Property(d => d.UpdatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<DietPlan>()
                .Property(d => d.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<ExercisePlan>()
                .Property(e => e.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<LikedVideo>()
                .Property(l => l.LikedAt)
                .HasDefaultValueSql("GETUTCDATE()");
        }
    }
}