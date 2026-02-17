# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B2B-style Inventory & Order Tracker — a full-stack app for managing products and tracking orders through fulfillment stages (Pending → Processing → Shipped → Delivered).

## Tech Stack

- **Backend:** ASP.NET Core 8 Web API (C#), Entity Framework Core
- **Database:** SQL Server (LocalDB/Docker for dev) or PostgreSQL via Npgsql as alternative
- **Frontend:** React + TypeScript + Tailwind CSS, built with Vite
- **Solution file:** `InventoryOrderTracker.sln`

## Project Structure

```
inventory-order-tracker/
  InventoryOrderTracker.sln
  InventoryOrderTracker.Api/         # ASP.NET Core Web API
    Controllers/
    Models/
    Data/
    Program.cs
  order-tracker-ui/                  # React + TypeScript + Vite
    src/
      components/
      pages/
      api/
```

## Common Commands

### Backend (from InventoryOrderTracker.Api/)
```bash
dotnet build                          # Build the API
dotnet run                            # Run the API (includes Swagger UI)
dotnet test                           # Run tests
dotnet ef migrations add <Name>       # Create a new EF migration
dotnet ef database update             # Apply migrations
```

### Frontend (from order-tracker-ui/)
```bash
npm install                           # Install dependencies
npm run dev                           # Start Vite dev server
npm run build                         # Production build
```

### Database (Docker)
```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourPassword123!" \
  -p 1433:1433 --name sql-server \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

## Data Model

Four entities: **Product**, **Order**, **OrderItem**, **StatusHistory**.

- `Order` has many `OrderItem`s (each referencing a `Product`) and many `StatusHistory` entries
- `OrderStatus` enum: `Pending`, `Processing`, `Shipped`, `Delivered`

## Business Logic Rules

- **Creating an order** deducts `QuantityOnHand` for each product. Reject if insufficient stock.
- **Status transitions** must follow strict order: Pending → Processing → Shipped → Delivered. No skipping steps.
- **Every status change** logs to `StatusHistory` with timestamp.
- **Low stock** = products where `QuantityOnHand <= ReorderThreshold`.

## API Endpoints

- `GET/POST /api/products`, `GET/PUT /api/products/{id}`, `GET /api/products/low-stock`
- `GET/POST /api/orders`, `GET /api/orders/{id}`, `PUT /api/orders/{id}/status`, `GET /api/orders/{id}/history`

## Frontend Pages

- **Dashboard** (`/`): summary cards, recent orders, low-stock alerts
- **Products** (`/products`): CRUD table with inline edit, low-stock highlighting
- **Orders** (`/orders`): filterable table by status
- **Order Detail** (`/orders/:id`): items, status timeline, "Advance Status" button
- **New Order** (`/orders/new`): customer name, product selector with available stock
