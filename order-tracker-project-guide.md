# Inventory & Order Tracker

A B2B-style full-stack app for managing products and tracking orders through fulfillment stages. Built to learn C#/.NET Core and demonstrate the enterprise stack (ASP.NET Core + React + SQL Server + AWS) that shows up in job postings.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | ASP.NET Core 8 Web API (C#) |
| **ORM** | Entity Framework Core |
| **Database** | SQL Server (LocalDB for dev, RDS for production) |
| **Frontend** | React + TypeScript + Tailwind CSS |
| **Build tool** | Vite |

---

## Prerequisites

### Install .NET SDK
```bash
# macOS (Homebrew)
brew install dotnet-sdk

# Verify
dotnet --version
```

### Install SQL Server
SQL Server doesn't run natively on macOS. Options:

**Option A: Docker (Recommended)**
```bash
# Pull SQL Server container
docker pull mcr.microsoft.com/mssql/server:2022-latest

# Run it
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourPassword123!" \
  -p 1433:1433 --name sql-server \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

**Option B: Use PostgreSQL instead**
Entity Framework Core supports PostgreSQL via `Npgsql.EntityFrameworkCore.PostgreSQL`. You already have PostgreSQL through Supabase. This still teaches C#/.NET patterns, just with a database you already know. Swap to SQL Server later when deploying to AWS RDS.

### Install a SQL client
- **Azure Data Studio** (free, cross-platform): https://aka.ms/azuredatastudio
- Or just use the CLI: `sqlcmd`

---

## Project Setup

### 1. Create the solution
```bash
mkdir order-tracker && cd order-tracker
dotnet new sln -n OrderTracker
dotnet new webapi -n OrderTracker.Api
dotnet sln add OrderTracker.Api
```

### 2. Add Entity Framework packages
```bash
cd OrderTracker.Api
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

### 3. Create the React frontend
```bash
cd ..
npm create vite@latest order-tracker-ui -- --template react-ts
cd order-tracker-ui
npm install
npm install tailwindcss @tailwindcss/vite
```

### 4. Final folder structure
```
order-tracker/
  OrderTracker.sln
  OrderTracker.Api/         # ASP.NET Core Web API
    Controllers/
    Models/
    Data/
    Program.cs
  order-tracker-ui/          # React + TypeScript
    src/
      components/
      pages/
      api/
```

---

## Data Model

### Products
| Column | Type | Notes |
|--------|------|-------|
| Id | int (PK) | Auto-increment |
| Name | string | Required |
| Sku | string | Unique |
| QuantityOnHand | int | Default 0 |
| ReorderThreshold | int | Default 10 |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

### Orders
| Column | Type | Notes |
|--------|------|-------|
| Id | int (PK) | Auto-increment |
| CustomerName | string | Required |
| Status | enum | Pending, Processing, Shipped, Delivered |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

### OrderItems
| Column | Type | Notes |
|--------|------|-------|
| Id | int (PK) | Auto-increment |
| OrderId | int (FK) | References Orders |
| ProductId | int (FK) | References Products |
| Quantity | int | Required, must be > 0 |

### StatusHistory
| Column | Type | Notes |
|--------|------|-------|
| Id | int (PK) | Auto-increment |
| OrderId | int (FK) | References Orders |
| OldStatus | enum | Nullable (null for initial creation) |
| NewStatus | enum | Required |
| ChangedAt | DateTime | |
| Note | string | Optional |

### Entity Framework Models (C#)
```csharp
// Models/Product.cs
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int QuantityOnHand { get; set; }
    public int ReorderThreshold { get; set; } = 10;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// Models/Order.cs
public class Order
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public List<StatusHistory> StatusHistory { get; set; } = new();
}

public enum OrderStatus
{
    Pending,
    Processing,
    Shipped,
    Delivered
}

// Models/OrderItem.cs
public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; }
}

// Models/StatusHistory.cs
public class StatusHistory
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public OrderStatus? OldStatus { get; set; }
    public OrderStatus NewStatus { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Note { get; set; }
}
```

---

## API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/{id}` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/{id}` | Update product |
| GET | `/api/products/low-stock` | Products below reorder threshold |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List all orders |
| GET | `/api/orders/{id}` | Get order with items and history |
| POST | `/api/orders` | Create order (deducts stock) |
| PUT | `/api/orders/{id}/status` | Advance order status |
| GET | `/api/orders/{id}/history` | Get status change audit trail |

### Business Logic Rules
- **Creating an order** deducts `QuantityOnHand` for each product. Reject if insufficient stock.
- **Status transitions** must follow the order: Pending -> Processing -> Shipped -> Delivered. No skipping.
- **Every status change** logs to `StatusHistory` with timestamp.
- **Low stock alert** returns products where `QuantityOnHand <= ReorderThreshold`.

---

## React Frontend Pages

### 1. Dashboard (`/`)
- Summary cards: total products, total orders, low-stock count
- Recent orders table (last 10)
- Low-stock alerts list

### 2. Products (`/products`)
- Table: Name, SKU, Qty on Hand, Reorder Threshold
- Inline edit for quantity
- "Add Product" form
- Low-stock rows highlighted

### 3. Orders (`/orders`)
- Table: ID, Customer, Status, Date, Item Count
- Filter by status
- "New Order" button

### 4. Order Detail (`/orders/:id`)
- Customer info and current status
- Items list with product names and quantities
- Status timeline (from StatusHistory)
- "Advance Status" button with confirmation

### 5. New Order (`/orders/new`)
- Customer name input
- Product selector with quantity (add multiple items)
- Shows available stock for each product
- Submit creates order and deducts inventory

---

## Build Order (Suggested)

Work through these phases. Each one is a complete, testable chunk.

### Phase 1: API Foundation
1. Set up ASP.NET Core project and Entity Framework
2. Create models and DbContext
3. Run migrations to create database tables
4. Build Products CRUD controller
5. Test with Swagger UI (comes built-in with ASP.NET Core)

### Phase 2: Orders API
1. Build Orders controller (create, list, get by ID)
2. Add order creation logic (stock deduction, validation)
3. Add status transition endpoint with validation
4. Add StatusHistory logging
5. Add low-stock endpoint

### Phase 3: React Frontend
1. Scaffold Vite + React + TypeScript + Tailwind
2. Set up API client (fetch wrapper or axios)
3. Build Products page (CRUD)
4. Build Orders list page
5. Build Order detail page with status timeline
6. Build New Order form
7. Build Dashboard

### Phase 4: Polish
1. Error handling (API returns proper error responses)
2. Input validation (both API and frontend)
3. Loading states and empty states in React
4. CORS configuration between API and React

### Phase 5: AWS Deployment (Stretch)
1. Push SQL Server to AWS RDS
2. Deploy API to Elastic Beanstalk or ECS
3. Deploy React to S3 + CloudFront
4. Update connection strings for production

---

## Key C# / .NET Concepts to Learn

As you build, you'll naturally pick up these patterns:

| Concept | Where You'll Use It |
|---------|-------------------|
| **Controllers** | Every API endpoint |
| **Dependency Injection** | DbContext, services |
| **Entity Framework Migrations** | Database schema changes |
| **LINQ** | Querying data (like SQL but in C#) |
| **DTOs (Data Transfer Objects)** | Shaping API responses |
| **Model Validation** | `[Required]`, `[Range]` attributes |
| **Async/Await** | All database calls (similar to JS) |
| **Enums** | Order status values |
| **Nullable types** | `string?`, `OrderStatus?` |

---

## Learning Resources

- **C# Basics (if needed):** https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/
- **ASP.NET Core Web API Tutorial:** https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api
- **Entity Framework Core Getting Started:** https://learn.microsoft.com/en-us/ef/core/get-started/overview/first-app
- **Deploy to AWS:** https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-dotnet-core-linux.html

---

## Resume Impact

Once complete, this project gives you:
- **C#/.NET Core** on your resume (fills the biggest gap for enterprise roles)
- **SQL Server** experience (the "MS SQL" that keeps appearing in postings)
- **AWS RDS** if you deploy Phase 5
- **Enterprise patterns** (audit trails, status workflows, data validation)
- A project that directly mirrors the pharmacy fulfillment workflows companies like Perfectrx described
