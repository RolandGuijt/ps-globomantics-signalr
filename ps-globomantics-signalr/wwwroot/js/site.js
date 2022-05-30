const InitializeSignalRConnection = () => {
    var connection = new signalR.HubConnectionBuilder().withUrl("/auctionHub").build();

    connection.on("ReceiveNewBid", ({ auctionId, newBid }) => {
        const tr = document.getElementById(auctionId + "-tr");   
        tr.classList.remove("animate-highlight");

        const bidText = document.getElementById(auctionId + "-bidtext");
        bidText.innerHTML = newBid;
        //start animation
        tr.classList.add("animate-highlight");
    });

    connection.start().catch((err) => {
        return console.error(err.toString());
    });

    return connection;
}

const connection = InitializeSignalRConnection();

const submitBid = (auctionId) => {
    const bid = document.getElementById(auctionId + "-input").value;
    fetch("/auction/" + auctionId + "/newbid?currentBid=" + bid, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        }
    });
    connection.invoke("NotifyNewBid", { auctionId: parseInt(auctionId), newBid: parseInt(bid) });
}
