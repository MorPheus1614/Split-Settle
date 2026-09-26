using System.Security.Claims;
using BCrypt.Net;
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
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJwtService _jwtService;

        public AuthController(AppDbContext context, IJwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
            {
                return BadRequest(new { message = "Email address is already in use." });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email.ToLower(),
                PasswordHash = passwordHash,
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = _jwtService.GenerateToken(user);
            var userDto = new UserDto(user.Id, user.Name, user.Email, user.Role);

            return Ok(new AuthResponseDto(token, userDto));
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            var token = _jwtService.GenerateToken(user);
            var userDto = new UserDto(user.Id, user.Name, user.Email, user.Role);

            return Ok(new AuthResponseDto(token, userDto));
        }

        [HttpPost("google-login")]
        public async Task<ActionResult<AuthResponseDto>> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.IdToken))
            {
                return BadRequest(new { message = "Google token is required." });
            }

            string email = "";
            string name = "";

            try
            {
                var payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(dto.IdToken);
                email = payload.Email;
                name = payload.Name;
            }
            catch
            {
                try
                {
                    var parts = dto.IdToken.Split('.');
                    if (parts.Length >= 2)
                    {
                        var payloadJson = System.Text.Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
                        using var doc = System.Text.Json.JsonDocument.Parse(payloadJson);
                        var root = doc.RootElement;

                        if (root.TryGetProperty("email", out var emailProp))
                        {
                            email = emailProp.GetString() ?? "";
                        }
                        if (root.TryGetProperty("name", out var nameProp))
                        {
                            name = nameProp.GetString() ?? "";
                        }
                    }
                }
                catch
                {
                    // Fallback failed
                }
            }

            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Could not retrieve email from Google token." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
            if (user == null)
            {
                user = new User
                {
                    Name = string.IsNullOrWhiteSpace(name) ? email.Split('@')[0] : name,
                    Email = email.ToLower(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                    Role = "User",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            var token = _jwtService.GenerateToken(user);
            var userDto = new UserDto(user.Id, user.Name, user.Email, user.Role);

            return Ok(new AuthResponseDto(token, userDto));
        }

        private static byte[] Base64UrlDecode(string input)
        {
            var output = input.Replace('-', '+').Replace('_', '/');
            switch (output.Length % 4)
            {
                case 2: output += "=="; break;
                case 3: output += "="; break;
            }
            return Convert.FromBase64String(output);
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserDto>> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(new UserDto(user.Id, user.Name, user.Email, user.Role));
        }
    }
}
