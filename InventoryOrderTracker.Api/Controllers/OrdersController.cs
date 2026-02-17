using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryOrderTracker.Api.Data;
using InventoryOrderTracker.Api.Models;
using InventoryOrderTracker.Api.Models.DTOs;

namespace InventoryOrderTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<Order>>> GetOrders([FromQuery] OrderStatus? status)
    {
        var query = _db.Orders
            .Include(o => o.Items)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Order>> GetOrder(int id)
    {
        var order = await _db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .Include(o => o.StatusHistory.OrderBy(h => h.ChangedAt))
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound();

        return Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder(CreateOrderDto dto)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var now = DateTime.UtcNow;
        var orderItems = new List<OrderItem>();

        foreach (var item in dto.Items)
        {
            var product = await _db.Products.FindAsync(item.ProductId);
            if (product == null)
                return BadRequest(new { message = $"Product with ID {item.ProductId} not found.", code = "PRODUCT_NOT_FOUND" });

            if (product.QuantityOnHand < item.Quantity)
                return BadRequest(new { message = $"Insufficient stock for '{product.Name}'. Available: {product.QuantityOnHand}, Requested: {item.Quantity}.", code = "INSUFFICIENT_STOCK" });

            product.QuantityOnHand -= item.Quantity;
            product.UpdatedAt = now;

            orderItems.Add(new OrderItem
            {
                ProductId = item.ProductId,
                Quantity = item.Quantity
            });
        }

        var order = new Order
        {
            CustomerName = dto.CustomerName,
            Status = OrderStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now,
            Items = orderItems,
            StatusHistory = new List<StatusHistory>
            {
                new StatusHistory
                {
                    OldStatus = OrderStatus.Pending,
                    NewStatus = OrderStatus.Pending,
                    ChangedAt = now,
                    Note = "Order created"
                }
            }
        };

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<Order>> UpdateOrderStatus(int id, UpdateOrderStatusDto dto)
    {
        var order = await _db.Orders
            .Include(o => o.StatusHistory)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound();

        if (order.Status == OrderStatus.Delivered)
            return BadRequest(new { message = "Order is already delivered and cannot be advanced further.", code = "ALREADY_DELIVERED" });

        var oldStatus = order.Status;
        var newStatus = (OrderStatus)((int)order.Status + 1);

        order.Status = newStatus;
        order.UpdatedAt = DateTime.UtcNow;

        order.StatusHistory.Add(new StatusHistory
        {
            OldStatus = oldStatus,
            NewStatus = newStatus,
            ChangedAt = DateTime.UtcNow,
            Note = dto.Note
        });

        await _db.SaveChangesAsync();

        return Ok(order);
    }

    [HttpGet("{id}/history")]
    public async Task<ActionResult<List<StatusHistory>>> GetOrderHistory(int id)
    {
        var orderExists = await _db.Orders.AnyAsync(o => o.Id == id);
        if (!orderExists)
            return NotFound();

        var history = await _db.StatusHistories
            .Where(h => h.OrderId == id)
            .OrderBy(h => h.ChangedAt)
            .ToListAsync();

        return Ok(history);
    }
}
