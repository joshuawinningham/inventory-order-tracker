using System.ComponentModel.DataAnnotations;

namespace InventoryOrderTracker.Api.Models.DTOs;

public class CreateOrderItemDto
{
    [Required]
    public int ProductId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }
}
