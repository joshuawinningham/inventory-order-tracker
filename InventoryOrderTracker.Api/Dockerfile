FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY InventoryOrderTracker.Api.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -r linux-x64 --self-contained false -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "InventoryOrderTracker.Api.dll"]
