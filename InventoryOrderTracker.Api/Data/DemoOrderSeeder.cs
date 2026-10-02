using InventoryOrderTracker.Api.Models;

namespace InventoryOrderTracker.Api.Data;

/// <summary>
/// Adds a handful of orders at different fulfillment stages so the demo has something
/// to show on first load. Dates are relative to startup so the data never looks stale.
/// Runs only when the Orders table is empty.
/// </summary>
public static class DemoOrderSeeder
{
    public static void Seed(AppDbContext db)
    {
        if (db.Orders.Any())
            return;

        var now = DateTime.UtcNow;

        // Product IDs refer to the catalog seeded in AppDbContext.OnModelCreating
        db.Orders.AddRange(
            BuildOrder("Riverside Family Pharmacy", now.AddDays(-6), OrderStatus.Delivered, (1, 40), (7, 100)),
            BuildOrder("Mercy General Hospital", now.AddDays(-3), OrderStatus.Shipped, (2, 60), (5, 30)),
            BuildOrder("Northside Urgent Care", now.AddDays(-1), OrderStatus.Processing, (8, 12), (4, 10)),
            BuildOrder("Lakeview Clinic", now.AddHours(-5), OrderStatus.Pending, (3, 50)),
            BuildOrder("Westgate Pharmacy", now.AddHours(-1), OrderStatus.Pending, (6, 20), (7, 50)));

        db.SaveChanges();
    }

    private static Order BuildOrder(string customerName, DateTime createdAt, OrderStatus status, params (int ProductId, int Quantity)[] items)
    {
        var history = new List<StatusHistory>
        {
            new StatusHistory
            {
                OldStatus = OrderStatus.Pending,
                NewStatus = OrderStatus.Pending,
                ChangedAt = createdAt,
                Note = "Order created"
            }
        };

        var changedAt = createdAt;
        for (var step = OrderStatus.Processing; step <= status; step++)
        {
            var (hours, note) = StepDetails(step);
            changedAt = changedAt.AddHours(hours);
            history.Add(new StatusHistory
            {
                OldStatus = step - 1,
                NewStatus = step,
                ChangedAt = changedAt,
                Note = note
            });
        }

        return new Order
        {
            CustomerName = customerName,
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = changedAt,
            Items = items.Select(i => new OrderItem { ProductId = i.ProductId, Quantity = i.Quantity }).ToList(),
            StatusHistory = history
        };
    }

    private static (int Hours, string Note) StepDetails(OrderStatus status) => status switch
    {
        OrderStatus.Processing => (3, "Picked and packed"),
        OrderStatus.Shipped => (20, "Shipped via UPS Ground"),
        _ => (40, "Delivered to receiving dock")
    };
}
