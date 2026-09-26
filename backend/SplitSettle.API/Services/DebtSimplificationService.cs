using SplitSettle.API.Dtos;
using SplitSettle.API.Models;

namespace SplitSettle.API.Services
{
    public class DebtSimplificationService : IDebtSimplificationService
    {
        public GroupBalanceSummaryDto CalculateGroupBalances(Group group)
        {
            var members = group.Members.Select(m => m.User).OfType<User>().ToList();
            var memberBalances = members.ToDictionary(u => u.Id, u => 0m);

            // 1. Process Expenses
            foreach (var expense in group.Expenses)
            {
                var paidById = expense.PaidById;
                if (!memberBalances.ContainsKey(paidById))
                {
                    memberBalances[paidById] = 0m;
                }

                memberBalances[paidById] += expense.Amount;

                foreach (var split in expense.Splits)
                {
                    if (!memberBalances.ContainsKey(split.UserId))
                    {
                        memberBalances[split.UserId] = 0m;
                    }

                    memberBalances[split.UserId] -= split.Amount;
                }
            }

            // 2. Process Settlements
            foreach (var settlement in group.Settlements)
            {
                // Payer gave money => their net debt reduces (balance goes +)
                if (!memberBalances.ContainsKey(settlement.PayerId))
                    memberBalances[settlement.PayerId] = 0m;
                memberBalances[settlement.PayerId] += settlement.Amount;

                // Payee received money => their net credit reduces (balance goes -)
                if (!memberBalances.ContainsKey(settlement.PayeeId))
                    memberBalances[settlement.PayeeId] = 0m;
                memberBalances[settlement.PayeeId] -= settlement.Amount;
            }

            // Construct member balance list
            var userBalanceDtos = members.Select(m => new UserBalanceDto(
                m!.Id,
                m.Name,
                m.Email,
                Math.Round(memberBalances.GetValueOrDefault(m.Id, 0m), 2)
            )).ToList();

            // 3. Compute Debt Simplification Algorithm (Min Cash Flow)
            var simplifiedDebts = SimplifyDebts(members, memberBalances, group.Expenses);

            decimal totalExpenses = group.Expenses.Sum(e => e.Amount);

            return new GroupBalanceSummaryDto(
                group.Id,
                group.Name,
                totalExpenses,
                userBalanceDtos,
                simplifiedDebts
            );
        }

        private List<DebtTransactionDto> SimplifyDebts(List<User> members, Dictionary<int, decimal> balances, ICollection<Expense> groupExpenses)
        {
            var userMap = members.ToDictionary(m => m.Id, m => m.Name);

            // Separate into Debtors (< 0) and Creditors (> 0)
            var debtors = new List<(int UserId, decimal Debt)>();
            var creditors = new List<(int UserId, decimal Credit)>();

            foreach (var (userId, net) in balances)
            {
                var rounded = Math.Round(net, 2);
                if (rounded < -0.01m)
                {
                    debtors.Add((userId, -rounded)); // Positive amount owed
                }
                else if (rounded > 0.01m)
                {
                    creditors.Add((userId, rounded)); // Positive amount to receive
                }
            }

            var transactions = new List<DebtTransactionDto>();

            int d = 0;
            int c = 0;

            while (d < debtors.Count && c < creditors.Count)
            {
                var debtor = debtors[d];
                var creditor = creditors[c];

                var settleAmount = Math.Min(debtor.Debt, creditor.Credit);
                settleAmount = Math.Round(settleAmount, 2);

                if (settleAmount > 0)
                {
                    var fromName = userMap.GetValueOrDefault(debtor.UserId, $"User {debtor.UserId}");
                    var toName = userMap.GetValueOrDefault(creditor.UserId, $"User {creditor.UserId}");

                    string? description = null;
                    if (groupExpenses != null && groupExpenses.Count > 0)
                    {
                        var directExpenseTitles = groupExpenses
                            .Where(e => e.PaidById == creditor.UserId && e.Splits.Any(s => s.UserId == debtor.UserId && s.Amount > 0))
                            .Select(e => e.Title)
                            .Distinct()
                            .ToList();

                        if (directExpenseTitles.Count > 0)
                        {
                            description = string.Join(", ", directExpenseTitles);
                        }
                        else
                        {
                            var debtorExpenseTitles = groupExpenses
                                .Where(e => e.Splits.Any(s => s.UserId == debtor.UserId && s.Amount > 0))
                                .Select(e => e.Title)
                                .Distinct()
                                .ToList();

                            if (debtorExpenseTitles.Count > 0)
                            {
                                description = string.Join(", ", debtorExpenseTitles);
                            }
                        }
                    }

                    transactions.Add(new DebtTransactionDto(
                        FromUserId: debtor.UserId,
                        FromUserName: fromName,
                        ToUserId: creditor.UserId,
                        ToUserName: toName,
                        Amount: settleAmount,
                        Description: description
                    ));
                }

                debtors[d] = (debtor.UserId, debtor.Debt - settleAmount);
                creditors[c] = (creditor.UserId, creditor.Credit - settleAmount);

                if (debtors[d].Debt <= 0.01m) d++;
                if (creditors[c].Credit <= 0.01m) c++;
            }

            return transactions;
        }
    }
}
