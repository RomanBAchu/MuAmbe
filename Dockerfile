# Этап сборки: используем официальный образ .NET 8 SDK
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копируем файл проекта и восстанавливаем зависимости
COPY ["AMBE.csproj", "./"]
RUN dotnet restore "AMBE.csproj"

# Копируем остальную структуру проекта
COPY . .

# Собираем и публикуем приложение в режиме Release
RUN dotnet publish "AMBE.csproj" -c Release -o /app/publish

# Этап запуска: используем ASP.NET Core Runtime (оптимизирован для запуска)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Копируем опубликованные файлы из этапа сборки
COPY --from=build /app/publish .

# Устанавливаем переменные окружения
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Открываем порт
EXPOSE 8080

# Точка входа
ENTRYPOINT ["dotnet", "AMBE.dll"]
