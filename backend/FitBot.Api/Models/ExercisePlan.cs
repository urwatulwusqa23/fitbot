namespace FitBot.Api.Models
{
    public class ExercisePlan
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = "";
        public string SplitType { get; set; } = "";
        public string PlanJson { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
        public User? User { get; set; }
    }
}