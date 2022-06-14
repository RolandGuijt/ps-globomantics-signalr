using IdentityModel.Client;
using Microsoft.AspNetCore.SignalR.Client;
using System.Net.Http.Json;

using var tokenClient = new HttpClient();

var tokenResponse = await tokenClient.RequestClientCredentialsTokenAsync(new ClientCredentialsTokenRequest
{
    Address = "https://demo.duendesoftware.com/connect/token",

    ClientId = "m2m",
    ClientSecret = "secret",
    Scope = "api"
});
var accessToken = tokenResponse.AccessToken;

using var httpClient = new HttpClient();
httpClient.BaseAddress = new Uri("https://localhost:7241");
httpClient.SetBearerToken(accessToken);

var response = await httpClient.GetAsync("/auctions");
var auctions = await response.Content.ReadFromJsonAsync<Auction[]>();

if (auctions == null)
    return;

foreach (var auction in auctions)
{
    Console.WriteLine($"{auction.Id,-3} {auction.ItemName,-20} {auction.CurrentBid,10}");
}

var connection = new HubConnectionBuilder()
    .WithUrl("https://localhost:7241/auctionhub",
        o => o.AccessTokenProvider = () => Task.FromResult(accessToken))
    .Build();

connection.On("ReceiveNewBid", (AuctionNotify auctionNotify) => {
    var auction = auctions.Single(a => a.Id == auctionNotify.AuctionId);
    auction.CurrentBid = auctionNotify.NewBid;
    Console.WriteLine("New bid:");
    Console.WriteLine($"{auction.Id,-3} {auction.ItemName,-20} {auction.CurrentBid,10}");
});

try
{
    await connection.StartAsync();
}
catch (Exception ex)
{
    Console.WriteLine(ex.Message);
}

try
{
    while (true)
    {
        Console.WriteLine("Auction id?");
        var id = Console.ReadLine();
        Console.WriteLine($"New bid for auction {id}?");
        var bid = Console.ReadLine();
        await connection.InvokeAsync("NotifyNewBid",
            new { AuctionId = int.Parse(id!), NewBid = int.Parse(bid!) });
        Console.WriteLine("Bid placed");
    }
}
finally
{
    await connection.StopAsync();
}