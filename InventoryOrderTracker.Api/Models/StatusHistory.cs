namespace InventoryOrderTracker.Api.Models;

public class StatusHistory
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public OrderStatus OldStatus { get; set; }
    public OrderStatus NewStatus { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Note { get; set; }

    public Order Order { get; set; } = null!;
}
