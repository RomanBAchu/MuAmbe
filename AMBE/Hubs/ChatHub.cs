using Microsoft.AspNetCore.SignalR;

namespace AMBE.Hubs
{
    public class ChatHub : Hub
    {
        // 1. Обычный чат
        public async Task SendMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }

        // 2. Улучшенный сигналинг для видео
        public async Task SendSignal(string signal, string target)
        {
            if (target == "all")
            {
                // Рассылаем всем, кроме того, кто звонит
                await Clients.Others.SendAsync("ReceiveSignal", signal, Context.ConnectionId);
            }
            else
            {
                // Шлем конкретному человеку (например, ответ на звонок)
                await Clients.Client(target).SendAsync("ReceiveSignal", signal, Context.ConnectionId);
            }
        }

        public override async Task OnConnectedAsync()
        {
            // Сообщаем всем, что новый участник в сети
            await Clients.Others.SendAsync("UserConnected", Context.ConnectionId);
            await base.OnConnectedAsync();
        }
    }
}
