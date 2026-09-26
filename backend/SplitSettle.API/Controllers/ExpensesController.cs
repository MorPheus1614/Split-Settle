using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSettle.API.Data;
using SplitSettle.API.Dtos;
using SplitSettle.API.Models;

namespace SplitSettle.API.Controllers
{
    [ApiController]
    [Route("api/groups/{groupId}/[controller]")]
    [Authorize]
    public class ExpensesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ExpensesController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(userIdStr, out int id) ? id : 0;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ExpenseResponseDto>>> GetExpenses(int groupId)
        {
            var userId = GetUserId();

            var isMember = await _context.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
            if (!isMember)
            {
                return Forbidden();
            }

            var expenses = await _context.Expenses
                .Include(e => e.PaidBy)
                .Include(e => e.Splits)
                    .ThenInclude(s => s.User)
                .Where(e => e.GroupId == groupId)
                .OrderByDescending(e => e.Date)
                .ToListAsync();

            var dtos = expenses.Select(MapToDto).ToList();
            return Ok(dtos);
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseResponseDto>> AddExpense(int groupId, [FromBody] CreateExpenseDto dto)
        {
            var currentUserId = GetUserId();

            var groupMembers = await _context.GroupMembers
                .Include(gm => gm.User)
                .Where(gm => gm.GroupId == groupId)
                .ToListAsync();

            if (!groupMembers.Any(gm => gm.UserId == currentUserId))
            {
                return Forbidden();
            }

            var expense = new Expense
            {
                GroupId = groupId,
                PaidById = currentUserId,
                Title = dto.Title,
                Amount = dto.Amount,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category,
                SplitType = string.IsNullOrWhiteSpace(dto.SplitType) ? "Equal" : dto.SplitType,
                Date = dto.Date ?? DateTime.UtcNow,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };

            // Calculate Splits
            if (dto.SplitType.Equals("Exact", StringComparison.OrdinalIgnoreCase) && dto.Splits != null && dto.Splits.Any())
            {
                foreach (var item in dto.Splits)
                {
                    expense.Splits.Add(new ExpenseSplit
                    {
                        UserId = item.UserId,
                        Amount = item.Amount,
                        Percentage = (dto.Amount > 0) ? Math.Round((item.Amount / dto.Amount) * 100, 2) : 0
                    });
                }
            }
            else if (dto.SplitType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) && dto.Splits != null && dto.Splits.Any())
            {
                foreach (var item in dto.Splits)
                {
                    var calcAmount = Math.Round((dto.Amount * item.Percentage) / 100m, 2);
                    expense.Splits.Add(new ExpenseSplit
                    {
                        UserId = item.UserId,
                        Amount = calcAmount,
                        Percentage = item.Percentage
                    });
                }
            }
            else // Default: Equal split among all group members or specified split users
            {
                var targetMemberIds = (dto.Splits != null && dto.Splits.Any())
                    ? dto.Splits.Select(s => s.UserId).ToList()
                    : groupMembers.Select(gm => gm.UserId).ToList();

                var perPersonAmount = Math.Round(dto.Amount / targetMemberIds.Count, 2);
                var perPersonPercent = Math.Round(100m / targetMemberIds.Count, 2);

                foreach (var mId in targetMemberIds)
                {
                    expense.Splits.Add(new ExpenseSplit
                    {
                        UserId = mId,
                        Amount = perPersonAmount,
                        Percentage = perPersonPercent
                    });
                }
            }

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            var savedExpense = await _context.Expenses
                .Include(e => e.PaidBy)
                .Include(e => e.Splits)
                    .ThenInclude(s => s.User)
                .FirstAsync(e => e.Id == expense.Id);

            return Ok(MapToDto(savedExpense));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int groupId, int id)
        {
            var userId = GetUserId();
            var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.GroupId == groupId);

            if (expense == null)
            {
                return NotFound();
            }

            if (expense.PaidById != userId)
            {
                var isGroupAdmin = await _context.GroupMembers
                    .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId && gm.Role == "Admin");
                if (!isGroupAdmin)
                {
                    return Forbidden();
                }
            }

            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private ObjectResult Forbidden() => StatusCode(403, new { message = "Forbidden. You are not a member of this group." });

        private static ExpenseResponseDto MapToDto(Expense e)
        {
            var splits = e.Splits.Select(s => new ExpenseSplitResponseDto(
                s.UserId,
                s.User?.Name ?? "User",
                s.User?.Email ?? "",
                s.Amount,
                s.Percentage
            )).ToList();

            return new ExpenseResponseDto(
                e.Id,
                e.GroupId,
                e.PaidById,
                e.PaidBy?.Name ?? "Unknown",
                e.Title,
                e.Amount,
                e.Category,
                e.SplitType,
                e.Date,
                e.Notes,
                e.CreatedAt,
                splits
            );
        }
    }
}
