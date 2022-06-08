const InitializeSignalRConnection = () => {
    var connection = new signalR.HubConnectionBuilder()
        .withUrl("/auctionHub")
        .withHubProtocol(new signalR.protocols.msgpack.MessagePackHubProtocol())
        .build();

    connection.on("ReceiveNewBid", ({ AuctionId, NewBid }) => {
        const tr = document.getElementById(AuctionId + "-tr");  
        const input = document.getElementById(AuctionId + "-input");
        //start animation
        setTimeout(() => tr.classList.add("animate-highlight"), 20);
        setTimeout(() => tr.classList.remove("animate-highlight"), 2000);

        const bidText = document.getElementById(AuctionId + "-bidtext");
        bidText.innerHTML = NewBid;
        input.value = NewBid + 1;
    });

    connection.on("ReceiveNewAuction", ({ Id, ItemName, CurrentBid }) => {
        var tbody = document.querySelector("#table>tbody");
        tbody.innerHTML += `<tr id="${Id}-tr" class="align-middle">
                                <td>${ItemName}</td >
                                <td id="${Id}-bidtext" class="bid">${CurrentBid}</td >
                                <td class="bid-form-td">
                                    <input id="${Id}-input" class="bid-input" type="number" value="${CurrentBid + 1}" />
                                    <button class="btn btn-primary" type="button" onclick="submitBid(${Id})">Bid</button>
                                </td>
                            </tr>`;
    });

    connection.on("NotifyOutbid", ({ AuctionId }) => {
        const tr = document.getElementById(AuctionId + "-tr");
        if (!tr.classList.contains("outbid"))
            tr.classList.add("outbid");
    });

    connection.start().catch((err) => {
        return console.error(err.toString());
    });

    return connection;
}

const connection = InitializeSignalRConnection();

const submitBid = (auctionId) => {
    const tr = document.getElementById(auctionId + "-tr");
    tr.classList.remove("outbid");

    const bid = document.getElementById(auctionId + "-input").value;
    fetch("/auction/" + auctionId + "/newbid?currentBid=" + bid, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        }
    });
    connection.invoke("NotifyNewBid", { AuctionId: parseInt(auctionId), NewBid: parseInt(bid) });
}

const submitAuction = () => {
    const itemName = document.getElementById("add-itemname").value;
    const currentBid = document.getElementById("add-currentbid").value;
    fetch("/auction", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemName, currentBid })
    });
}
