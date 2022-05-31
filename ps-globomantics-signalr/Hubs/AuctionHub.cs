using Microsoft.AspNetCore.SignalR;
using ps_globomantics_signalr.Models;

namespace ps_globomantics_signalr.Hubs
{
    public class AuctionHub: Hub
    {
        public async Task NotifyNewBid(AuctionNotify auction)
        {
            var groupName = $"auction-{auction.AuctionId}";
            await Clients.OthersInGroup(groupName).SendAsync("NotifyOverbid", auction);

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.All.SendAsync("ReceiveNewBid", auction);
        }
    }
}
