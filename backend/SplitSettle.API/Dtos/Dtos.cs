using System.ComponentModel.DataAnnotations;

namespace SplitSettle.API.Dtos
{
    // Auth DTOs
    public record RegisterDto(
        [Required, MaxLength(100)] string Name,
        [Required, EmailAddress] string Email,
        [Required, MinLength(6)] string Password
    );

    public record LoginDto(
        [Required, EmailAddress] string Email,
        [Required] string Password
    );

    public record GoogleLoginDto(
        [Required] string IdToken
    );

    public record UserDto(
        int Id,
        string Name,
        string Email,
        string Role
    );

    public record AuthResponseDto(
        string Token,
        UserDto User
    );

    // Group DTOs
    public record CreateGroupDto(
        [Required, MaxLength(100)] string Name,
        [MaxLength(250)] string Description,
        [MaxLength(50)] string GroupType
    );

    public record JoinGroupDto(
        [Required, MaxLength(12)] string InviteCode
    );

    public record AddMemberDto(
        [Required, EmailAddress] string Email
    );

    public record GroupMemberDto(
        int UserId,
        string Name,
        string Email,
        string Role,
        DateTime JoinedAt
    );

    public record GroupResponseDto(
        int Id,
        string Name,
        string Description,
        string GroupType,
        string InviteCode,
        int CreatedById,
        DateTime CreatedAt,
        int MemberCount,
        decimal TotalExpenses,
        List<GroupMemberDto> Members
    );

    // Expense DTOs
    public record ExpenseSplitInputDto(
        int UserId,
        decimal Amount,
        decimal Percentage
    );

    public record CreateExpenseDto(
        [Required, MaxLength(150)] string Title,
        [Required, Range(0.01, 1000000)] decimal Amount,
        string Category,
        string SplitType, // "Equal", "Exact", "Percentage"
        DateTime? Date,
        string? Notes,
        List<ExpenseSplitInputDto>? Splits
    );

    public record ExpenseSplitResponseDto(
        int UserId,
        string UserName,
        string UserEmail,
        decimal Amount,
        decimal Percentage
    );

    public record ExpenseResponseDto(
        int Id,
        int GroupId,
        int PaidById,
        string PaidByName,
        string Title,
        decimal Amount,
        string Category,
        string SplitType,
        DateTime Date,
        string? Notes,
        DateTime CreatedAt,
        List<ExpenseSplitResponseDto> Splits
    );

    // Settlement & Debt DTOs
    public record CreateSettlementDto(
        int PayeeId,
        [Required, Range(0.01, 1000000)] decimal Amount,
        string? Notes
    );

    public record SettlementResponseDto(
        int Id,
        int GroupId,
        int PayerId,
        string PayerName,
        int PayeeId,
        string PayeeName,
        decimal Amount,
        DateTime SettlementDate,
        string? Notes
    );

    public record DebtTransactionDto(
        int FromUserId,
        string FromUserName,
        int ToUserId,
        string ToUserName,
        decimal Amount,
        string? Description = null
    );

    public record UserBalanceDto(
        int UserId,
        string UserName,
        string UserEmail,
        decimal NetBalance // Positive = owed money to them, Negative = owes money to others
    );

    public record GroupBalanceSummaryDto(
        int GroupId,
        string GroupName,
        decimal TotalGroupExpenses,
        List<UserBalanceDto> MemberBalances,
        List<DebtTransactionDto> SimplifiedDebts
    );

    // Dashboard & Analytics DTOs
    public record CategorySpendingDto(
        string Category,
        decimal TotalAmount,
        double Percentage
    );

    public record RecentActivityDto(
        int Id,
        string Type, // "Expense", "Settlement"
        string Title,
        decimal Amount,
        string UserFullName,
        string GroupName,
        DateTime Date
    );

    public record DashboardSummaryDto(
        decimal NetBalance,
        decimal YouAreOwedTotal,
        decimal YouOweTotal,
        int ActiveGroupsCount,
        List<CategorySpendingDto> CategoryBreakdown,
        List<RecentActivityDto> RecentActivities,
        List<DebtTransactionDto> PendingActionableSettlements
    );
}
