using BCrypt.Net;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using SplitSettle.API.Models;

namespace SplitSettle.API.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            var databaseCreator = context.Database.GetService<IDatabaseCreator>() as RelationalDatabaseCreator;
            if (databaseCreator != null)
            {
                if (!databaseCreator.Exists())
                {
                    databaseCreator.Create();
                }
            }

            try
            {
                context.Database.EnsureCreated();
            }
            catch
            {
                // Database schema already exists
            }

            if (context.Users.Any())
            {
                return; // DB already seeded
            }

            // Seed Users
            var passwordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");

            var alex = new User
            {
                Name = "Alex Rivers",
                Email = "alex@example.com",
                PasswordHash = passwordHash,
                Role = "Admin"
            };

            var sarah = new User
            {
                Name = "Sarah Chen",
                Email = "sarah@example.com",
                PasswordHash = passwordHash,
                Role = "User"
            };

            var marcus = new User
            {
                Name = "Marcus Vance",
                Email = "marcus@example.com",
                PasswordHash = passwordHash,
                Role = "User"
            };

            var elena = new User
            {
                Name = "Elena Rostova",
                Email = "elena@example.com",
                PasswordHash = passwordHash,
                Role = "User"
            };

            context.Users.AddRange(alex, sarah, marcus, elena);
            context.SaveChanges();

            // Seed Groups
            var goaTrip = new Group
            {
                Name = "Goa Summer Vacation 🌴",
                Description = "Beach villa rental, food, scooter rentals and party expenses",
                GroupType = "Trip",
                InviteCode = "GOA2026TRIP",
                CreatedById = alex.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            };

            var apartment = new Group
            {
                Name = "Apartment 4B Shared 🏠",
                Description = "Monthly rent, electricity, Wi-Fi, groceries and repair split",
                GroupType = "Home",
                InviteCode = "APT4BSHARE",
                CreatedById = sarah.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            };

            context.Groups.AddRange(goaTrip, apartment);
            context.SaveChanges();

            // Seed Members
            context.GroupMembers.AddRange(
                new GroupMember { GroupId = goaTrip.Id, UserId = alex.Id, Role = "Admin" },
                new GroupMember { GroupId = goaTrip.Id, UserId = sarah.Id, Role = "Member" },
                new GroupMember { GroupId = goaTrip.Id, UserId = marcus.Id, Role = "Member" },
                new GroupMember { GroupId = goaTrip.Id, UserId = elena.Id, Role = "Member" },

                new GroupMember { GroupId = apartment.Id, UserId = alex.Id, Role = "Member" },
                new GroupMember { GroupId = apartment.Id, UserId = sarah.Id, Role = "Admin" },
                new GroupMember { GroupId = apartment.Id, UserId = marcus.Id, Role = "Member" }
            );
            context.SaveChanges();

            // Seed Expenses for Goa Trip (in INR ₹)
            var exp1 = new Expense
            {
                GroupId = goaTrip.Id,
                PaidById = alex.Id,
                Title = "Beachfront Luxury Villa Stay",
                Amount = 18000.00m,
                Category = "Accommodation",
                SplitType = "Equal",
                Date = DateTime.UtcNow.AddDays(-8),
                Notes = "Booked 3 nights via Airbnb"
            };
            exp1.Splits = new List<ExpenseSplit>
            {
                new ExpenseSplit { UserId = alex.Id, Amount = 4500.00m, Percentage = 25 },
                new ExpenseSplit { UserId = sarah.Id, Amount = 4500.00m, Percentage = 25 },
                new ExpenseSplit { UserId = marcus.Id, Amount = 4500.00m, Percentage = 25 },
                new ExpenseSplit { UserId = elena.Id, Amount = 4500.00m, Percentage = 25 }
            };

            var exp2 = new Expense
            {
                GroupId = goaTrip.Id,
                PaidById = sarah.Id,
                Title = "Seafood Feast & Cocktails",
                Amount = 4500.00m,
                Category = "Food",
                SplitType = "Equal",
                Date = DateTime.UtcNow.AddDays(-6),
                Notes = "Dinner at Curlies Shack"
            };
            exp2.Splits = new List<ExpenseSplit>
            {
                new ExpenseSplit { UserId = alex.Id, Amount = 1125.00m, Percentage = 25 },
                new ExpenseSplit { UserId = sarah.Id, Amount = 1125.00m, Percentage = 25 },
                new ExpenseSplit { UserId = marcus.Id, Amount = 1125.00m, Percentage = 25 },
                new ExpenseSplit { UserId = elena.Id, Amount = 1125.00m, Percentage = 25 }
            };

            var exp3 = new Expense
            {
                GroupId = goaTrip.Id,
                PaidById = marcus.Id,
                Title = "Car Rental & Fuel",
                Amount = 6000.00m,
                Category = "Travel",
                SplitType = "Equal",
                Date = DateTime.UtcNow.AddDays(-5),
                Notes = "SUV rental for 4 days"
            };
            exp3.Splits = new List<ExpenseSplit>
            {
                new ExpenseSplit { UserId = alex.Id, Amount = 1500.00m, Percentage = 25 },
                new ExpenseSplit { UserId = sarah.Id, Amount = 1500.00m, Percentage = 25 },
                new ExpenseSplit { UserId = marcus.Id, Amount = 1500.00m, Percentage = 25 },
                new ExpenseSplit { UserId = elena.Id, Amount = 1500.00m, Percentage = 25 }
            };

            var exp4 = new Expense
            {
                GroupId = goaTrip.Id,
                PaidById = elena.Id,
                Title = "Scuba Diving & Watersports",
                Amount = 8000.00m,
                Category = "Entertainment",
                SplitType = "Equal",
                Date = DateTime.UtcNow.AddDays(-2),
                Notes = "Grande Island trip"
            };
            exp4.Splits = new List<ExpenseSplit>
            {
                new ExpenseSplit { UserId = alex.Id, Amount = 2000.00m, Percentage = 25 },
                new ExpenseSplit { UserId = sarah.Id, Amount = 2000.00m, Percentage = 25 },
                new ExpenseSplit { UserId = marcus.Id, Amount = 2000.00m, Percentage = 25 },
                new ExpenseSplit { UserId = elena.Id, Amount = 2000.00m, Percentage = 25 }
            };

            context.Expenses.AddRange(exp1, exp2, exp3, exp4);
            context.SaveChanges();

            // Seed a partial settlement
            var settlement = new Settlement
            {
                GroupId = goaTrip.Id,
                PayerId = sarah.Id,
                PayeeId = alex.Id,
                Amount = 1500.00m,
                SettlementDate = DateTime.UtcNow.AddDays(-1),
                Notes = "Paid part of Villa debt via UPI"
            };
            context.Settlements.Add(settlement);
            context.SaveChanges();
        }
    }
}
