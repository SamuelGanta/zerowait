async function loadOrders() {

    try {

        const response =
            await fetch("/api/orders");

        const orders =
            await response.json();

        const container =
            document.getElementById("orders");

        let html = "";

        let revenue = 0;
        let pendingCount = 0;

        orders.forEach(order => {

            revenue += Number(order.amount);

            if (order.status === "Pending") {
                pendingCount++;
            }

            let badgeClass = "pending-badge";

            if (order.status === "Preparing") {
                badgeClass = "preparing-badge";
            }

            if (order.status === "Ready") {
                badgeClass = "ready-badge";
            }

            html += `
            <div class="order-card">

                <div class="order-header">

                    <div class="order-id">
                        Order #${order.id}
                    </div>

                    <div class="amount">
                        ₹${order.amount}
                    </div>

                </div>

                <div class="status-badge ${badgeClass}">
                    ${order.status}
                </div>

                <div class="buttons">

                    <button
                        class="pending"
                        onclick="updateStatus(${order.id}, 'Pending')">
                        Pending
                    </button>

                    <button
                        class="preparing"
                        onclick="updateStatus(${order.id}, 'Preparing')">
                        Preparing
                    </button>

                    <button
                        class="ready"
                        onclick="updateStatus(${order.id}, 'Ready')">
                        Ready
                    </button>

                </div>

            </div>
            `;
        });

        if (orders.length === 0) {

            html = `
            <div class="empty">
                <h2>No Orders Yet</h2>
            </div>
            `;
        }

        container.innerHTML = html;

        document.getElementById("totalOrders").innerText =
            orders.length;

        document.getElementById("pendingCount").innerText =
            pendingCount;

        document.getElementById("revenue").innerText =
            revenue.toFixed(0);

    } catch (err) {

        console.error(err);
    }
}

async function updateStatus(orderId, status) {

    try {

        await fetch(
            `/api/orders/${orderId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status
                })
            }
        );

        loadOrders();

    } catch (err) {

        console.error(err);
    }
}

loadOrders();

/* Auto refresh every 3 seconds */

setInterval(() => {

    loadOrders();

}, 3000);