using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSettle.API.Data;
using SplitSettle.API.Dtos;
using SplitSettle.API.Models;
using SplitSettle.API.Services;

namespace SplitSettle.API.Controllers
{
    [ApiController]
    [Route("api/groups/{groupId}/[controller]")]
    [Authorize]
    public class SettlementsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IDebtSimplificationService _debtSimplificationService;

        public SettlementsController(AppDbContext context, IDebtSimplificationService debtSimplificationService)
        {
            _context = context;
            _debtSimplificationService = debtSimplificationService;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(userIdStr, out int id) ? id : 0;
        }

        [HttpGet("/api/groups/{groupId}/balances")]
        public async Task<ActionResult<GroupBalanceSummaryDto>> GetGroupBalances(int groupId)
        {
            var userId = GetUserId();

            var group = await _context.Groups
                .Include(g => g.Members)
                    .ThenInclude(m => m.User)
                .Include(g => g.Expenses)
                    .ThenInclude(e => e.Splits)
                .Include(g => g.Settlements)
                .FirstOrDefaultAsync(g => g.Id == groupId && g.Members.Any(m => m.UserId == userId));

            if (group == null)
            {
                return NotFound(new { message = "Group not found or access denied." });
            }

            var summary = _debtSimplificationService.CalculateGroupBalances(group);
            return Ok(summary);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SettlementResponseDto>>> GetSettlements(int groupId)
        {
            var userId = GetUserId();
            var isMember = await _context.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
            if (!isMember)
            {
                return StatusCode(403, new { message = "Forbidden" });
            }

            var settlements = await _context.Settlements
                .Include(s => s.Payer)
                .Include(s => s.Payee)
                .Where(s => s.GroupId == groupId)
                .OrderByDescending(s => s.SettlementDate)
                .ToListAsync();

            var dtos = settlements.Select(s => new SettlementResponseDto(
                s.Id,
                s.GroupId,
                s.PayerId,
                s.Payer?.Name ?? "User",
                s.PayeeId,
                s.Payee?.Name ?? "User",
                s.Amount,
                s.SettlementDate,
                s.Notes
            )).ToList();

            return Ok(dtos);
        }

        [HttpPost]
        public async Task<ActionResult<SettlementResponseDto>> CreateSettlement(int groupId, [FromBody] CreateSettlementDto dto)
        {
            var currentUserId = GetUserId();

            var groupMembers = await _context.GroupMembers
                .Where(gm => gm.GroupId == groupId)
                .Select(gm => gm.UserId)
                .ToListAsync();

            if (!groupMembers.Contains(currentUserId) || !groupMembers.Contains(dto.PayeeId))
            {
                return BadRequest(new { message = "Payer or Payee is not a member of this group." });
            }

            var settlement = new Settlement
            {
                GroupId = groupId,
                PayerId = currentUserId,
                PayeeId = dto.PayeeId,
                Amount = dto.Amount,
                SettlementDate = DateTime.UtcNow,
                Notes = dto.Notes
            };

            _context.Settlements.Add(settlement);
            await _context.SaveChangesAsync();

            var saved = await _context.Settlements
                .Include(s => s.Payer)
                .Include(s => s.Payee)
                .FirstAsync(s => s.Id == settlement.Id);

            return Ok(new SettlementResponseDto(
                saved.Id,
                saved.GroupId,
                saved.PayerId,
                saved.Payer?.Name ?? "User",
                saved.PayeeId,
                saved.Payee?.Name ?? "User",
                saved.Amount,
                saved.SettlementDate,
                saved.Notes
            ));
        }
    }
}
