async function loadOrders() {

try {

    const response =
        await fetch("/api/orders");

    const orders =
        await response.json();

    const container =
        document.getElementById("ordersContainer");

    container.innerHTML = "";

    orders.forEach(order => {

        const statusClass =
            order.status
            ? order.status.toLowerCase()
            : "pending";

        container.innerHTML += `
        <div class="order-card">

            <div class="order-header">

                <div class="order-id">
                    Order #${order.id}
                </div>

                <div class="status ${statusClass}">
                    ${order.status || "Pending"}
                </div>

            </div>

            <div class="order-info">

                <p>
                    <strong>Amount:</strong>
                    ₹${order.amount}
                </p>

                <p>
                    <strong>Items:</strong>
                    ${order.items || "N/A"}
                </p>

                <p>
                    <strong>Order Type:</strong>
                    ${order.order_type || "N/A"}
                </p>

                <p>
                    <strong>Table:</strong>
                    ${order.table_number || "-"}
                </p>

            </div>

            <button
                class="reorder-btn">

                Reorder

            </button>

        </div>
        `;
    });

} catch (err) {

    console.error(err);

}

}

loadOrders();
