using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.SignalR;
using ps_globomantics_signalr.Hubs;
using ps_globomantics_signalr.Models;
using ps_globomantics_signalr.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR(o => o.EnableDetailedErrors = true);
builder.Services.AddSingleton<IAuctionRepo, AuctionMemoryRepo>();

builder.Services.AddBff(o => o.ManagementBasePath = "/account");

builder.Services.AddAuthentication(o =>
{
    o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = "oidc";
    o.DefaultSignOutScheme = "oidc";
})
    .AddCookie()
    .AddOpenIdConnect("oidc", options =>
    {
        options.Authority = "https://demo.duendesoftware.com";

        // confidential client using code flow + PKCE
        options.ClientId = "interactive.confidential";
        options.ClientSecret = "secret";
        options.ResponseType = "code";
        options.UsePkce = true;

        // query response type is compatible with strict SameSite mode
        options.ResponseMode = "query";

        // get claims without mappings
        options.MapInboundClaims = false;
        options.GetClaimsFromUserInfoEndpoint = true;

        // save tokens into authentication session
        // to enable automatic token management
        options.SaveTokens = true;

        // request scopes
        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("api");

        // and refresh token
        options.Scope.Add("offline_access");
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapPost("auction/{auctionId}/newbid", (int auctionId, int currentBid, IAuctionRepo auctionRepo) =>
{
    auctionRepo.NewBid(auctionId, currentBid);
});

app.MapPost("auction", (Auction auction, IAuctionRepo auctionRepo, IHubContext<AuctionHub> hubContext) =>
{
    auctionRepo.AddAuction(auction);
    hubContext.Clients.All.SendAsync("ReceiveNewAuction", auction);
});

app.UseEndpoints(e => e.MapBffManagementEndpoints());

app.MapHub<AuctionHub>("/auctionHub");

app.Run();
