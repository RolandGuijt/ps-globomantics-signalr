const InitializeSignalRConnection = () => {
    var connection = new signalR.HubConnectionBuilder().withUrl("/auctionhub").build();

    connection.on("ReceiveNewBid", ({ auctionId, newBid }) => {
        const tr = document.getElementById(auctionId + "-tr");
        const input = document.getElementById(auctionId + "-input");
        //start animation
        tr.classList.add("animate-highlight");
        setTimeout(() => tr.classList.remove("animate-highlight"), 2000);

        const bidText = document.getElementById(auctionId + "-bidtext");
        bidText.innerHTML = newBid;
        input.value = newBid + 1;
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
