using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSettle.API.Data;
using SplitSettle.API.Dtos;
using SplitSettle.API.Services;

namespace SplitSettle.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IDebtSimplificationService _debtSimplificationService;

        public AnalyticsController(AppDbContext context, IDebtSimplificationService debtSimplificationService)
        {
            _context = context;
            _debtSimplificationService = debtSimplificationService;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(userIdStr, out int id) ? id : 0;
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<DashboardSummaryDto>> GetDashboard()
        {
            var userId = GetUserId();

            var userGroups = await _context.Groups
                .Include(g => g.Members)
                    .ThenInclude(m => m.User)
                .Include(g => g.Expenses)
                    .ThenInclude(e => e.Splits)
                .Include(g => g.Settlements)
                .Where(g => g.Members.Any(m => m.UserId == userId))
                .ToListAsync();

            decimal totalYouAreOwed = 0m;
            decimal totalYouOwe = 0m;
            var pendingActions = new List<DebtTransactionDto>();

            foreach (var group in userGroups)
            {
                var summary = _debtSimplificationService.CalculateGroupBalances(group);

                // Check simplified debts involving current user
                foreach (var debt in summary.SimplifiedDebts)
                {
                    if (debt.FromUserId == userId)
                    {
                        totalYouOwe += debt.Amount;
                        pendingActions.Add(debt);
                    }
                    else if (debt.ToUserId == userId)
                    {
                        totalYouAreOwed += debt.Amount;
                        pendingActions.Add(debt);
                    }
                }
            }

            decimal netBalance = totalYouAreOwed - totalYouOwe;

            // Category Breakdown across all user's groups
            var allExpenses = userGroups.SelectMany(g => g.Expenses).ToList();
            var categoryTotals = allExpenses
                .GroupBy(e => e.Category)
                .Select(g => new
                {
                    Category = g.Key,
                    Total = g.Sum(e => e.Amount)
                })
                .ToList();

            decimal grandTotalSpending = categoryTotals.Sum(c => c.Total);
            var categoryBreakdown = categoryTotals.Select(c => new CategorySpendingDto(
                c.Category,
                c.Total,
                grandTotalSpending > 0 ? (double)Math.Round((c.Total / grandTotalSpending) * 100, 1) : 0
            )).OrderByDescending(c => c.TotalAmount).ToList();

            // Recent Activity stream across user's groups
            var recentActivities = new List<RecentActivityDto>();

            foreach (var exp in allExpenses)
            {
                var grp = userGroups.FirstOrDefault(g => g.Id == exp.GroupId);
                recentActivities.Add(new RecentActivityDto(
                    exp.Id,
                    "Expense",
                    exp.Title,
                    exp.Amount,
                    exp.PaidBy?.Name ?? "User",
                    grp?.Name ?? "Group",
                    exp.Date
                ));
            }

            var allSettlements = userGroups.SelectMany(g => g.Settlements).ToList();
            foreach (var st in allSettlements)
            {
                var grp = userGroups.FirstOrDefault(g => g.Id == st.GroupId);
                recentActivities.Add(new RecentActivityDto(
                    st.Id,
                    "Settlement",
                    $"Settlement: {st.Payer?.Name} paid {st.Payee?.Name}",
                    st.Amount,
                    st.Payer?.Name ?? "User",
                    grp?.Name ?? "Group",
                    st.SettlementDate
                ));
            }

            var sortedActivities = recentActivities
                .OrderByDescending(a => a.Date)
                .Take(10)
                .ToList();

            return Ok(new DashboardSummaryDto(
                netBalance,
                totalYouAreOwed,
                totalYouOwe,
                userGroups.Count,
                categoryBreakdown,
                sortedActivities,
                pendingActions
            ));
        }
    }
}
