using Microsoft.EntityFrameworkCore;
using InventoryOrderTracker.Api.Models;

namespace InventoryOrderTracker.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<StatusHistory> StatusHistories => Set<StatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Product
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasIndex(p => p.Sku).IsUnique();
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.Sku).IsRequired().HasMaxLength(50);
        });

        // Order
        modelBuilder.Entity<Order>(entity =>
        {
            entity.Property(o => o.CustomerName).IsRequired().HasMaxLength(200);
            entity.Property(o => o.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasMany(o => o.Items)
                .WithOne(i => i.Order)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(o => o.StatusHistory)
                .WithOne(h => h.Order)
                .HasForeignKey(h => h.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // OrderItem
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasOne(i => i.Product)
                .WithMany()
                .HasForeignKey(i => i.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // StatusHistory
        modelBuilder.Entity<StatusHistory>(entity =>
        {
            entity.Property(h => h.OldStatus)
                .HasConversion<string>()
                .HasMaxLength(20);
            entity.Property(h => h.NewStatus)
                .HasConversion<string>()
                .HasMaxLength(20);
            entity.Property(h => h.Note).HasMaxLength(500);
        });

        // Seed data
        var now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        modelBuilder.Entity<Product>().HasData(
            new Product { Id = 1, Name = "Amoxicillin 500mg", Sku = "AMX-500", QuantityOnHand = 250, ReorderThreshold = 50, CreatedAt = now, UpdatedAt = now },
            new Product { Id = 2, Name = "Lisinopril 10mg", Sku = "LIS-010", QuantityOnHand = 180, ReorderThreshold = 40, CreatedAt = now, UpdatedAt = now },
            new Product { Id = 3, Name = "Metformin 850mg", Sku = "MET-850", QuantityOnHand = 300, ReorderThreshold = 60, CreatedAt = now, UpdatedAt = now },
            new Product { Id = 4, Name = "Omeprazole 20mg", Sku = "OMP-020", QuantityOnHand = 15, ReorderThreshold = 30, CreatedAt = now, UpdatedAt = now },
            new Product { Id = 5, Name = "Atorvastatin 40mg", Sku = "ATV-040", QuantityOnHand = 120, ReorderThreshold = 25, CreatedAt = now, UpdatedAt = now },
            new Product { Id = 6, Name = "Sertraline 50mg", Sku = "SRT-050", QuantityOnHand = 90, ReorderThreshold = 20, CreatedAt = now, UpdatedAt = now },
            new Product { Id = 7, Name = "Ibuprofen 200mg", Sku = "IBU-200", QuantityOnHand = 500, ReorderThreshold = 100, CreatedAt = now, UpdatedAt = now },
            new Product { Id = 8, Name = "Azithromycin 250mg", Sku = "AZT-250", QuantityOnHand = 8, ReorderThreshold = 20, CreatedAt = now, UpdatedAt = now }
        );
    }
}
