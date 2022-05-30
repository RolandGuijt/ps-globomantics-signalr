using System.ComponentModel.DataAnnotations;

namespace ps_globomantics_signalr.Models
{
    public class Auction
    {
        public int Id { get; set; }
        public string ItemName { get; set; } = "";
        public int CurrentBid { get; set; }
    }
}
