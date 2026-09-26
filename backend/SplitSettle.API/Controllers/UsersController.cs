using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSettle.API.Data;
using SplitSettle.API.Dtos;

namespace SplitSettle.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers([FromQuery] string? query = null, [FromQuery] int? excludeGroupId = null)
        {
            var usersQuery = _context.Users.AsQueryable();

            if (excludeGroupId.HasValue && excludeGroupId.Value > 0)
            {
                var existingMemberIds = await _context.GroupMembers
                    .Where(gm => gm.GroupId == excludeGroupId.Value)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                usersQuery = usersQuery.Where(u => !existingMemberIds.Contains(u.Id));
            }

            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.Trim().ToLower();
                usersQuery = usersQuery.Where(u => u.Name.ToLower().Contains(q) || u.Email.ToLower().Contains(q));
            }

            var users = await usersQuery
                .OrderBy(u => u.Name)
                .Take(20)
                .Select(u => new UserDto(u.Id, u.Name, u.Email, u.Role))
                .ToListAsync();

            return Ok(users);
        }
    }
}
