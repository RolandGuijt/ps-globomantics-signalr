const InitializeSignalRConnection = () => {
    var connection = new signalR.HubConnectionBuilder().withUrl("/auctionHub").build();

    connection.on("ReceiveNewBid", ({ auctionId, newBid }) => {
        const tr = document.getElementById(auctionId + "-tr");
        const input = document.getElementById(auctionId + "-input");
        //start animation
        setTimeout(() => tr.classList.add("animate-highlight"), 20);
        setTimeout(() => tr.classList.remove("animate-highlight"), 2000);

        const bidText = document.getElementById(auctionId + "-bidtext");
        bidText.innerHTML = newBid;
        input.value = newBid + 1;
    });

    connection.on("ReceiveNewAuction", ({ id, itemName, currentBid }) => {
        var tbody = document.querySelector("#table>tbody");
        tbody.innerHTML += `<tr id="${id}-tr" class="align-middle">
                                <td>${itemName}</td >
                                <td id="${id}-bidtext" class="bid">${currentBid}</td >
                                <td class="bid-form-td">
                                    <input id="${id}-input" class="bid-input" type="number" value="${currentBid + 1}" />
                                    <button class="btn btn-primary" type="button" onclick="submitBid(${id})">Bid</button>
                                </td>
                            </tr>`;
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
    if (connection.state !== signalR.HubConnectionState.Connected)
        location.reload();
    connection.invoke("NotifyNewBid", { auctionId: parseInt(auctionId), newBid: parseInt(bid) });
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
