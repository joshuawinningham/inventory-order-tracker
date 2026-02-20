# Inventory & Order Tracker

A full-stack B2B inventory management and order fulfillment system. Track products, manage stock levels, create orders, and advance them through fulfillment stages with a complete audit trail.

**Live Demo:** [https://d1t1jyx1chuvoh.cloudfront.net](https://d1t1jyx1chuvoh.cloudfront.net)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | ASP.NET Core 8 (C#) |
| ORM | Entity Framework Core |
| Database | SQL Server |
| Frontend | React, TypeScript, Tailwind CSS |
| Build Tool | Vite |
| Infrastructure | AWS (App Runner, RDS, S3, CloudFront) |

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│   React UI   │────▶│  ASP.NET Core    │────▶│   SQL Server   │
│  CloudFront  │     │   App Runner     │     │    AWS RDS     │
│   + S3       │     │                  │     │                │
└──────────────┘     └──────────────────┘     └────────────────┘
     HTTPS              VPC Connector            Private Subnet
```

## Features

- **Product Management** — CRUD operations with SKU tracking and stock levels
- **Order Fulfillment Workflow** — Orders progress through Pending → Processing → Shipped → Delivered with strict transition enforcement
- **Inventory Control** — Stock automatically deducted on order creation, with insufficient stock rejection
- **Low Stock Alerts** — Products flagged when quantity falls below configurable reorder thresholds
- **Audit Trail** — Every status change logged to StatusHistory with timestamps
- **Dashboard** — Summary cards, recent orders, and low-stock alerts at a glance

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/{id}` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/{id}` | Update product |
| GET | `/api/products/low-stock` | Products below reorder threshold |
| GET | `/api/orders` | List orders (filterable by status) |
| GET | `/api/orders/{id}` | Get order with items and history |
| POST | `/api/orders` | Create order (deducts stock) |
| PUT | `/api/orders/{id}/status` | Advance order status |
| GET | `/api/orders/{id}/history` | Status change audit trail |

## Data Model

```
Product ──┐
           ├──▶ OrderItem ──▶ Order ──▶ StatusHistory
Product ──┘
```

Four entities: **Product**, **Order**, **OrderItem**, and **StatusHistory**. Orders contain multiple items, each referencing a product. Every status transition is recorded for auditing.

## Local Development

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (for SQL Server)

### Database

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourPassword123!" \
  -p 1433:1433 --name sql-server \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

### Backend

```bash
cd InventoryOrderTracker.Api
dotnet ef database update
dotnet run
```

The API runs at `http://localhost:5239` with Swagger UI available in development mode.

### Frontend

```bash
cd order-tracker-ui
npm install
npm run dev
```

The UI runs at `http://localhost:5173`.
