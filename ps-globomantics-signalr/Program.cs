using Microsoft.AspNetCore.SignalR;
using ps_globomantics_signalr.Hubs;
using ps_globomantics_signalr.Models;
using ps_globomantics_signalr.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ps_globomantics_signalr.Areas.Identity.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseInMemoryDatabase("DbInMem"));

builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddEntityFrameworkStores<ApplicationDbContext>();;

builder.Services.AddAuthorization(o => 
    o.AddPolicy("AdminRequired", p => p.RequireClaim("role", "admin")));

builder.Services.AddControllersWithViews();
builder.Services.AddRazorPages();
builder.Services.AddSignalR(o => o.EnableDetailedErrors = true);
builder.Services.AddSingleton<IAuctionRepo, AuctionMemoryRepo>();

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
app.UseAuthentication();;

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

app.MapHub<AuctionHub>("/auctionHub");
app.MapRazorPages();

app.Run();
