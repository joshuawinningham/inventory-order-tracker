using System.Net;
using System.Net.Http.Json;
using InventoryOrderTracker.Api.Models;

namespace InventoryOrderTracker.Tests;

public class ProductsApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public ProductsApiTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetProducts_ReturnsSeedCatalog()
    {
        var products = await _client.GetFromJsonAsync<List<Product>>("/api/products", ApiFactory.Json);

        Assert.NotNull(products);
        Assert.Contains(products, p => p.Sku == "AMX-500");
        Assert.True(products.Count >= 8);
    }

    [Fact]
    public async Task CreateProduct_WithDuplicateSku_Returns409()
    {
        var response = await _client.PostAsJsonAsync("/api/products", new
        {
            name = "Duplicate Amoxicillin",
            sku = "AMX-500",
            quantityOnHand = 1,
            reorderThreshold = 0
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var error = await response.ReadAsync<ErrorBody>();
        Assert.Equal("DUPLICATE_SKU", error.Code);
        Assert.Contains("AMX-500", error.Message);
    }

    [Fact]
    public async Task UpdateProduct_ToAnotherProductsSku_Returns409()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 5);

        var response = await _client.PutAsJsonAsync($"/api/products/{product.Id}", new
        {
            name = product.Name,
            sku = "AMX-500",
            quantityOnHand = product.QuantityOnHand,
            reorderThreshold = product.ReorderThreshold
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProduct_KeepingItsOwnSku_Succeeds()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 5);

        var response = await _client.PutAsJsonAsync($"/api/products/{product.Id}", new
        {
            name = product.Name,
            sku = product.Sku,
            quantityOnHand = 42,
            reorderThreshold = product.ReorderThreshold
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(42, (await response.ReadAsync<Product>()).QuantityOnHand);
    }

    [Fact]
    public async Task CreateProduct_WithNegativeQuantity_FailsValidation()
    {
        var response = await _client.PostAsJsonAsync("/api/products", new
        {
            name = "Bad Product",
            sku = "BAD-001",
            quantityOnHand = -1,
            reorderThreshold = 0
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task LowStock_IncludesProductsAtOrBelowThreshold()
    {
        var atThreshold = await _client.CreateProductAsync(quantityOnHand: 5, reorderThreshold: 5);
        var aboveThreshold = await _client.CreateProductAsync(quantityOnHand: 6, reorderThreshold: 5);

        var lowStock = await _client.GetFromJsonAsync<List<Product>>("/api/products/low-stock", ApiFactory.Json);

        Assert.NotNull(lowStock);
        Assert.Contains(lowStock, p => p.Id == atThreshold.Id);
        Assert.DoesNotContain(lowStock, p => p.Id == aboveThreshold.Id);
    }

    [Fact]
    public async Task GetProduct_Unknown_Returns404()
    {
        var response = await _client.GetAsync("/api/products/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
