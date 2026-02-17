using System.ComponentModel.DataAnnotations;

namespace InventoryOrderTracker.Api.Models.DTOs;

public class CreateOrderDto
{
    [Required]
    [StringLength(200)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public List<CreateOrderItemDto> Items { get; set; } = new();
}
