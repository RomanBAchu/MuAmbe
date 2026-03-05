using AMBE.Hubs;
using AMBE.Components;

var builder = WebApplication.CreateBuilder(args);

// 1. Добавляем сервисы
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddSignalR();

// Добавляем CORS (пригодится для WebRTC и внешних подключений)
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials();
    });
});

var app = builder.Build();

// 2. Настройка конвейера (ПОРЯДОК ВАЖЕН!)
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();

// Сначала разрешаем отдавать CSS/JS файлы из wwwroot
app.UseStaticFiles();

// Затем включаем маршрутизацию и защиту
app.UseRouting();
app.UseAntiforgery();
app.UseCors();

// 3. Регистрация эндпоинтов
app.MapHub<ChatHub>("/chathub");

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
