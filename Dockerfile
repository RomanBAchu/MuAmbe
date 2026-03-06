# 1. Базовый образ
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
# ПРИНУДИТЕЛЬНО задаем порт 8080 (Render его любит)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
# Важно для работы SignalR через прокси Render
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

# 2. Сборка
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
# ВНИМАНИЕ: путь должен точно совпадать с твоей структурой в GitHub
COPY ["AMBE/AMBE.csproj", "AMBE/"]
RUN dotnet restore "AMBE/AMBE.csproj"
COPY . .
WORKDIR "/src/AMBE"
RUN dotnet build "AMBE.csproj" -c $BUILD_CONFIGURATION -o /app/build

# 3. Публикация
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "AMBE.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# 4. Финал
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
# Убедись, что файл действительно называется AMBE.dll
ENTRYPOINT ["dotnet", "AMBE.dll"]
