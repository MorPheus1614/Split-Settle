using SplitSettle.API.Dtos;
using SplitSettle.API.Models;

namespace SplitSettle.API.Services
{
    public interface IDebtSimplificationService
    {
        GroupBalanceSummaryDto CalculateGroupBalances(Group group);
    }
}
