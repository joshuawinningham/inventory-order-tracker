using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InventoryOrderTracker.Api.Models;

namespace InventoryOrderTracker.Tests;

public class OrdersApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public OrdersApiTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateOrder_DeductsStockAndStartsPending()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 10);

        var response = await _client.CreateOrderAsync((product.Id, 3));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.ReadAsync<Order>();
        Assert.Equal(OrderStatus.Pending, order.Status);
        Assert.Single(order.StatusHistory);
        Assert.Equal(7, (await _client.GetProductAsync(product.Id)).QuantityOnHand);
    }

    [Fact]
    public async Task CreateOrder_WithInsufficientStock_IsRejectedAndStockUnchanged()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 2);

        var response = await _client.CreateOrderAsync((product.Id, 5));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("INSUFFICIENT_STOCK", (await response.ReadAsync<ErrorBody>()).Code);
        Assert.Equal(2, (await _client.GetProductAsync(product.Id)).QuantityOnHand);
    }

    [Fact]
    public async Task CreateOrder_WhenALaterLineFails_DoesNotDeductEarlierLines()
    {
        var plentiful = await _client.CreateProductAsync(quantityOnHand: 10);
        var scarce = await _client.CreateProductAsync(quantityOnHand: 1);

        var response = await _client.CreateOrderAsync((plentiful.Id, 4), (scarce.Id, 5));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(10, (await _client.GetProductAsync(plentiful.Id)).QuantityOnHand);
        Assert.Equal(1, (await _client.GetProductAsync(scarce.Id)).QuantityOnHand);
    }

    [Fact]
    public async Task CreateOrder_WithSameProductOnTwoLines_ChecksCombinedQuantity()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 5);

        var response = await _client.CreateOrderAsync((product.Id, 3), (product.Id, 3));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(5, (await _client.GetProductAsync(product.Id)).QuantityOnHand);
    }

    [Fact]
    public async Task CreateOrder_ForUnknownProduct_IsRejected()
    {
        var response = await _client.CreateOrderAsync((999_999, 1));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("PRODUCT_NOT_FOUND", (await response.ReadAsync<ErrorBody>()).Code);
    }

    [Fact]
    public async Task CreateOrder_WithNoItems_FailsValidation()
    {
        var response = await _client.PostAsJsonAsync("/api/orders", new { customerName = "Acme", items = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdvanceStatus_MovesOneStageAtATimeAndStopsAtDelivered()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 10);
        var order = await (await _client.CreateOrderAsync((product.Id, 1))).ReadAsync<Order>();

        var expected = new[] { OrderStatus.Processing, OrderStatus.Shipped, OrderStatus.Delivered };
        foreach (var status in expected)
        {
            var advanced = await _client.AdvanceStatusAsync(order.Id);
            Assert.Equal(HttpStatusCode.OK, advanced.StatusCode);
            Assert.Equal(status, (await advanced.ReadAsync<Order>()).Status);
        }

        var pastDelivered = await _client.AdvanceStatusAsync(order.Id);
        Assert.Equal(HttpStatusCode.BadRequest, pastDelivered.StatusCode);
        Assert.Equal("ALREADY_DELIVERED", (await pastDelivered.ReadAsync<ErrorBody>()).Code);
    }

    [Fact]
    public async Task AdvanceStatus_RecordsEachTransitionInHistory()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 10);
        var order = await (await _client.CreateOrderAsync((product.Id, 1))).ReadAsync<Order>();

        await _client.AdvanceStatusAsync(order.Id, note: "Picked from shelf B3");
        await _client.AdvanceStatusAsync(order.Id);

        var history = await _client.GetFromJsonAsync<List<StatusHistory>>($"/api/orders/{order.Id}/history", ApiFactory.Json);

        Assert.NotNull(history);
        Assert.Collection(history,
            h => Assert.Equal((OrderStatus.Pending, OrderStatus.Pending), (h.OldStatus, h.NewStatus)),
            h =>
            {
                Assert.Equal((OrderStatus.Pending, OrderStatus.Processing), (h.OldStatus, h.NewStatus));
                Assert.Equal("Picked from shelf B3", h.Note);
            },
            h => Assert.Equal((OrderStatus.Processing, OrderStatus.Shipped), (h.OldStatus, h.NewStatus)));
    }

    [Fact]
    public async Task GetOrders_FiltersByStatus()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 10);
        var pending = await (await _client.CreateOrderAsync((product.Id, 1))).ReadAsync<Order>();
        var processing = await (await _client.CreateOrderAsync((product.Id, 1))).ReadAsync<Order>();
        await _client.AdvanceStatusAsync(processing.Id);

        var orders = await _client.GetFromJsonAsync<List<Order>>("/api/orders?status=Processing", ApiFactory.Json);

        Assert.NotNull(orders);
        Assert.All(orders, o => Assert.Equal(OrderStatus.Processing, o.Status));
        Assert.Contains(orders, o => o.Id == processing.Id);
        Assert.DoesNotContain(orders, o => o.Id == pending.Id);
    }

    [Fact]
    public async Task DemoOrders_AreSeededWithHistoryMatchingTheirStatus()
    {
        var orders = await _client.GetFromJsonAsync<List<Order>>("/api/orders", ApiFactory.Json);
        Assert.NotNull(orders);

        foreach (var status in Enum.GetValues<OrderStatus>())
        {
            var seeded = orders.First(o => o.Status == status);
            var detail = await _client.GetFromJsonAsync<Order>($"/api/orders/{seeded.Id}", ApiFactory.Json);

            // One "Order created" entry plus one per transition reached
            Assert.Equal((int)status + 1, detail!.StatusHistory.Count);
            Assert.Equal(status, detail.StatusHistory.Last().NewStatus);
        }
    }

    [Fact]
    public async Task Timestamps_AreSerializedAsUtc()
    {
        var product = await _client.CreateProductAsync(quantityOnHand: 10);
        var order = await (await _client.CreateOrderAsync((product.Id, 1))).ReadAsync<Order>();

        // Read back from the database rather than echoing the entity just created
        using var json = JsonDocument.Parse(await _client.GetStringAsync($"/api/orders/{order.Id}"));

        Assert.EndsWith("Z", json.RootElement.GetProperty("createdAt").GetString());
        Assert.EndsWith("Z", json.RootElement.GetProperty("statusHistory")[0].GetProperty("changedAt").GetString());
    }

    [Fact]
    public async Task GetOrder_Unknown_Returns404()
    {
        var response = await _client.GetAsync("/api/orders/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
