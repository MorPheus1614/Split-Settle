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
    [Route("api/[controller]")]
    [Authorize]
    public class GroupsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GroupsController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(userIdStr, out int id) ? id : 0;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GroupResponseDto>>> GetMyGroups()
        {
            var userId = GetUserId();

            var groups = await _context.Groups
                .Include(g => g.Members)
                    .ThenInclude(m => m.User)
                .Include(g => g.Expenses)
                .Where(g => g.Members.Any(m => m.UserId == userId))
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();

            var dtos = groups.Select(g => MapToDto(g)).ToList();
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<GroupResponseDto>> GetGroupById(int id)
        {
            var userId = GetUserId();

            var group = await _context.Groups
                .Include(g => g.Members)
                    .ThenInclude(m => m.User)
                .Include(g => g.Expenses)
                .FirstOrDefaultAsync(g => g.Id == id && g.Members.Any(m => m.UserId == userId));

            if (group == null)
            {
                return NotFound(new { message = "Group not found or you are not a member." });
            }

            return Ok(MapToDto(group));
        }

        [HttpPost]
        public async Task<ActionResult<GroupResponseDto>> CreateGroup([FromBody] CreateGroupDto dto)
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            var inviteCode = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();

            var group = new Group
            {
                Name = dto.Name,
                Description = dto.Description,
                GroupType = string.IsNullOrWhiteSpace(dto.GroupType) ? "Trip" : dto.GroupType,
                InviteCode = inviteCode,
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };

            group.Members.Add(new GroupMember
            {
                UserId = userId,
                Role = "Admin",
                JoinedAt = DateTime.UtcNow
            });

            _context.Groups.Add(group);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetGroupById), new { id = group.Id }, MapToDto(group));
        }

        [HttpPost("join")]
        public async Task<ActionResult<GroupResponseDto>> JoinGroup([FromBody] JoinGroupDto dto)
        {
            var userId = GetUserId();
            var code = dto.InviteCode.Trim().ToUpper();

            var group = await _context.Groups
                .Include(g => g.Members)
                    .ThenInclude(m => m.User)
                .Include(g => g.Expenses)
                .FirstOrDefaultAsync(g => g.InviteCode == code);

            if (group == null)
            {
                return BadRequest(new { message = "Invalid invite code." });
            }

            if (group.Members.Any(m => m.UserId == userId))
            {
                return BadRequest(new { message = "You are already a member of this group." });
            }

            group.Members.Add(new GroupMember
            {
                UserId = userId,
                Role = "Member",
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return Ok(MapToDto(group));
        }

        [HttpPost("{id}/members")]
        public async Task<ActionResult<GroupResponseDto>> AddMember(int id, [FromBody] AddMemberDto dto)
        {
            var currentUserId = GetUserId();
            var group = await _context.Groups
                .Include(g => g.Members)
                    .ThenInclude(m => m.User)
                .Include(g => g.Expenses)
                .FirstOrDefaultAsync(g => g.Id == id && g.Members.Any(m => m.UserId == currentUserId));

            if (group == null)
            {
                return NotFound(new { message = "Group not found." });
            }

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (targetUser == null)
            {
                return BadRequest(new { message = "User with specified email address does not exist." });
            }

            if (group.Members.Any(m => m.UserId == targetUser.Id))
            {
                return BadRequest(new { message = "User is already in this group." });
            }

            group.Members.Add(new GroupMember
            {
                UserId = targetUser.Id,
                Role = "Member",
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return Ok(MapToDto(group));
        }

        private static GroupResponseDto MapToDto(Group group)
        {
            var memberDtos = group.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User?.Name ?? "Unknown",
                m.User?.Email ?? "",
                m.Role,
                m.JoinedAt
            )).ToList();

            return new GroupResponseDto(
                group.Id,
                group.Name,
                group.Description,
                group.GroupType,
                group.InviteCode,
                group.CreatedById,
                group.CreatedAt,
                group.Members.Count,
                group.Expenses.Sum(e => e.Amount),
                memberDtos
            );
        }
    }
}
