using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ps_globomantics_signalr.Models;

namespace ps_globomantics_signalr.Hubs
{
    [Authorize]
    public class AuctionHub: Hub
    {
        public async Task NotifyNewBid(AuctionNotify auction)
        {
            var groupName = $"auction-{auction.AuctionId}";
           
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.OthersInGroup(groupName).SendAsync("NotifyOutbid", auction);
            
            await Clients.All.SendAsync("ReceiveNewBid", auction);
        }
    }
}
