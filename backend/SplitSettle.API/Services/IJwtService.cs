using SplitSettle.API.Models;

namespace SplitSettle.API.Services
{
    public interface IJwtService
    {
        string GenerateToken(User user);
    }
}
