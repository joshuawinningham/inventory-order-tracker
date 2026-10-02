using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InventoryOrderTracker.Api.Data;
using InventoryOrderTracker.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace InventoryOrderTracker.Tests;

/// <summary>
/// Boots the real API in memory against a private SQLite database. Startup runs the
/// EF Core migrations and seed data exactly as production does.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    // An in-memory SQLite database lives only as long as its connection stays open.
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public ApiFactory()
    {
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
            _connection.Dispose();
    }
}

public record ErrorBody(string Message, string Code);

public static class ApiClientExtensions
{
    /// <summary>
    /// Creates a product with a unique SKU so tests sharing a database never collide.
    /// </summary>
    public static async Task<Product> CreateProductAsync(this HttpClient client, int quantityOnHand, int reorderThreshold = 0)
    {
        var sku = $"TST-{Guid.NewGuid():N}"[..20];
        var response = await client.PostAsJsonAsync("/api/products", new
        {
            name = $"Test Product {sku}",
            sku,
            quantityOnHand,
            reorderThreshold
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Product>(ApiFactory.Json))!;
    }

    public static async Task<Product> GetProductAsync(this HttpClient client, int id) =>
        (await client.GetFromJsonAsync<Product>($"/api/products/{id}", ApiFactory.Json))!;

    public static Task<HttpResponseMessage> CreateOrderAsync(this HttpClient client, params (int ProductId, int Quantity)[] items) =>
        client.PostAsJsonAsync("/api/orders", new
        {
            customerName = "Acme Pharmacy",
            items = items.Select(i => new { productId = i.ProductId, quantity = i.Quantity })
        });

    public static Task<HttpResponseMessage> AdvanceStatusAsync(this HttpClient client, int orderId, string? note = null) =>
        client.PutAsJsonAsync($"/api/orders/{orderId}/status", new { note });

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<T>(ApiFactory.Json))!;
}
