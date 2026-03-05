using AMBE.Hubs;
using AMBE.Components;

var builder = WebApplication.CreateBuilder(args);

// 1. Подключаем Блейзор и интерактив
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddSignalR();

// CORS для WebRTC (чтобы браузеры не ругались при коннекте)
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .SetIsOriginAllowed(_ => true)
              .AllowCredentials();
    });
});

var app = builder.Build();

// 2. Конвейер обработки (Порядок критичен!)
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // Сначала отдаем webrtc.js и стили
app.UseAntiforgery(); // Защита форм
app.UseCors();        // Разрешаем кросс-доменные запросы

// 3. Регистрация Хаба и Главного компонента
app.MapHub<ChatHub>("/chathub");

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
