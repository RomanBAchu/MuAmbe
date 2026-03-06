# 1. Базовый образ для запуска
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
# Render ожидает, что приложение слушает порт, мы фиксируем 8080
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
# Добавляем поддержку прокси Render для SignalR и HTTPS
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

# 2. Образ для сборки
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
# Копируем файл проекта и восстанавливаем зависимости
COPY ["AMBE/AMBE.csproj", "AMBE/"]
RUN dotnet restore "AMBE/AMBE.csproj"
# Копируем всё остальное и собираем
COPY . .
WORKDIR "/src/AMBE"
RUN dotnet build "AMBE.csproj" -c $BUILD_CONFIGURATION -o /app/build

# 3. Публикация приложения
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "AMBE.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# 4. Финальный образ
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AMBE.dll"]
