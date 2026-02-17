using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryOrderTracker.Api.Data;
using InventoryOrderTracker.Api.Models;
using InventoryOrderTracker.Api.Models.DTOs;

namespace InventoryOrderTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProductsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<Product>>> GetAll()
    {
        return await _db.Products.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();
        return product;
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create(CreateProductDto dto)
    {
        var product = new Product
        {
            Name = dto.Name,
            Sku = dto.Sku,
            QuantityOnHand = dto.QuantityOnHand,
            ReorderThreshold = dto.ReorderThreshold,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Product>> Update(int id, UpdateProductDto dto)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.Name = dto.Name;
        product.Sku = dto.Sku;
        product.QuantityOnHand = dto.QuantityOnHand;
        product.ReorderThreshold = dto.ReorderThreshold;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return product;
    }

    [HttpGet("low-stock")]
    public async Task<ActionResult<List<Product>>> GetLowStock()
    {
        return await _db.Products
            .Where(p => p.QuantityOnHand <= p.ReorderThreshold)
            .ToListAsync();
    }
}
