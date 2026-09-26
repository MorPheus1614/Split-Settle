using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SplitSettle.API.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Role { get; set; } = "User"; // "Admin", "User"

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public ICollection<GroupMember> GroupMemberships { get; set; } = new List<GroupMember>();
        
        [JsonIgnore]
        public ICollection<Expense> ExpensesPaid { get; set; } = new List<Expense>();
        
        [JsonIgnore]
        public ICollection<ExpenseSplit> ExpenseSplits { get; set; } = new List<ExpenseSplit>();
    }

    public class Group
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(50)]
        public string GroupType { get; set; } = "Trip"; // "Trip", "Home", "Event", "Other"

        [Required, MaxLength(12)]
        public string InviteCode { get; set; } = string.Empty;

        public int CreatedById { get; set; }

        [ForeignKey(nameof(CreatedById))]
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
        public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
        public ICollection<Settlement> Settlements { get; set; } = new List<Settlement>();
    }

    public class GroupMember
    {
        [Key]
        public int Id { get; set; }

        public int GroupId { get; set; }
        [ForeignKey(nameof(GroupId))]
        [JsonIgnore]
        public Group? Group { get; set; }

        public int UserId { get; set; }
        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        public string Role { get; set; } = "Member"; // "Admin", "Member"

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }

    public class Expense
    {
        [Key]
        public int Id { get; set; }

        public int GroupId { get; set; }
        [ForeignKey(nameof(GroupId))]
        [JsonIgnore]
        public Group? Group { get; set; }

        public int PaidById { get; set; }
        [ForeignKey(nameof(PaidById))]
        public User? PaidBy { get; set; }

        [Required, MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string Category { get; set; } = "General"; // Food, Travel, Utilities, Entertainment, Rent, Other

        [MaxLength(20)]
        public string SplitType { get; set; } = "Equal"; // Equal, Exact, Percentage

        public DateTime Date { get; set; } = DateTime.UtcNow;

        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ExpenseSplit> Splits { get; set; } = new List<ExpenseSplit>();
    }

    public class ExpenseSplit
    {
        [Key]
        public int Id { get; set; }

        public int ExpenseId { get; set; }
        [ForeignKey(nameof(ExpenseId))]
        [JsonIgnore]
        public Expense? Expense { get; set; }

        public int UserId { get; set; }
        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal Percentage { get; set; }
    }

    public class Settlement
    {
        [Key]
        public int Id { get; set; }

        public int GroupId { get; set; }
        [ForeignKey(nameof(GroupId))]
        [JsonIgnore]
        public Group? Group { get; set; }

        public int PayerId { get; set; }
        [ForeignKey(nameof(PayerId))]
        public User? Payer { get; set; }

        public int PayeeId { get; set; }
        [ForeignKey(nameof(PayeeId))]
        public User? Payee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        public DateTime SettlementDate { get; set; } = DateTime.UtcNow;

        public string? Notes { get; set; }
    }
}
