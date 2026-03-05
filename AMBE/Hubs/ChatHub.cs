using Microsoft.AspNetCore.SignalR;

namespace AMBE.Hubs
{
    public class ChatHub : Hub
    {
        // Список всех подключенных ID
        private static readonly Dictionary<string, string> Users = new();

        public async Task SendMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }

        public async Task SendSignal(string signal, string target)
        {
            await Clients.Client(target).SendAsync("ReceiveSignal", signal, Context.ConnectionId);
        }

        public override async Task OnConnectedAsync()
        {
            Users[Context.ConnectionId] = "User"; // Временно
            await Clients.All.SendAsync("UpdateUserList", Users.Keys.ToList());
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Users.Remove(Context.ConnectionId);
            await Clients.All.SendAsync("UpdateUserList", Users.Keys.ToList());
            await base.OnDisconnectedAsync(exception);
        }
    }
}
