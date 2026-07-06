const params = new URLSearchParams(window.location.search);
const restaurantId = params.get("id");

let cart = {};
let currentRestaurant = null;

// =====================
// RESTAURANT WALLPAPERS
// =====================
const wallpaperMap = {
  'Hyderabadi': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&q=80',
  'Biryani': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80',
  'BBQ': 'https://images.unsplash.com/photo-1555939594-58d7cb561537?w=1200&q=80',
  'Indian': 'https://images.unsplash.com/photo-1585521537066-a282e5294970?w=1200&q=80',
  'Featured': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80'
};

function getWallpaper(cuisine) {
  return wallpaperMap[cuisine] || wallpaperMap['Featured'];
}

// =====================
// LOAD RESTAURANT MENU
// =====================

async function loadRestaurant() {

    try {

        const response = await fetch(
            `/api/restaurants/${restaurantId}`
        );

        const data = await response.json();
        
        currentRestaurant = data;

        document.getElementById(
            "restaurantName"
        ).innerText = data.name;
        
        // Set wallpaper based on cuisine
        const wallpaper = getWallpaper(data.cuisine);
        const heroSection = document.getElementById('heroSection');
        heroSection.style.backgroundImage = `url('${wallpaper}')`;

        const menuContainer =
            document.getElementById("menuContainer");

        menuContainer.innerHTML = "";

        data.menu.forEach(item => {

            menuContainer.innerHTML += `
                <div class="menu-card">

                    <h3>${item.name}</h3>

                    <p>₹${item.price}</p>

                    <button onclick="addToCart('${item.name}', ${item.price})">
                        Add To Cart
                    </button>

                </div>
            `;
        });

    } catch (error) {

        console.error(error);

        showToast("Could not load menu");
    }
}

// =====================
// TOAST MESSAGE
// =====================

function showToast(message) {

    const toast = document.createElement("div");

    toast.innerText = message;

    Object.assign(toast.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "#00a8a8",
        color: "#ffffff",
        padding: "15px 25px",
        borderRadius: "12px",
        fontWeight: "bold",
        zIndex: "9999",
        boxShadow: "0 5px 20px rgba(0,0,0,0.2)"
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// =====================
// ADD TO CART
// =====================

function addToCart(item, price) {

    if (!cart[item]) {

        cart[item] = {
            price: price,
            quantity: 0
        };
    }

    cart[item].quantity++;

    renderCart();

    showToast(item + " added to cart");
}

// =====================
// INCREASE QTY
// =====================

function increaseQuantity(item) {

    cart[item].quantity++;

    renderCart();
}

// =====================
// DECREASE QTY
// =====================

function decreaseQuantity(item) {

    cart[item].quantity--;

    if (cart[item].quantity <= 0) {

        delete cart[item];
    }

    renderCart();
}

// =====================
// TOTAL
// =====================

function calculateTotal() {

    let total = 0;

    Object.values(cart).forEach(product => {

        total += product.price * product.quantity;
    });

    return total;
}

// =====================
// RENDER CART
// =====================

function renderCart() {

    const cartContainer =
        document.getElementById("cartItems");

    let html = "";

    Object.keys(cart).forEach(item => {

        const product = cart[item];

        const itemTotal =
            product.price * product.quantity;

        html += `
        <div class="cart-item">

            <div>

                <strong>${item}</strong>

                <p>
                    ₹${product.price} × ${product.quantity}
                    = ₹${itemTotal}
                </p>

            </div>

            <div class="qty-controls">

                <button onclick="decreaseQuantity('${item}')">
                    -
                </button>

                <span>
                    ${product.quantity}
                </span>

                <button onclick="increaseQuantity('${item}')">
                    +
                </button>

            </div>

        </div>
        `;
    });

    if (html === "") {

        html = `
        <p style="
            color:#777;
            text-align:center;
            padding:20px;
        ">
            Your cart is empty
        </p>
        `;
    }

    cartContainer.innerHTML = html;

    document.getElementById("cartTotal").innerText =
        calculateTotal();
}

// =====================
// CHECKOUT
// =====================

async function checkout() {

    const total = calculateTotal();

    if (total === 0) {

        showToast("Cart is empty");
        return;
    }

    const customerName =
        document.getElementById("customerName").value;

    const orderType =
        document.getElementById("orderType").value;

    const tableNumber =
        document.getElementById("tableNumber").value;

    if (!customerName.trim()) {

        showToast("Enter customer name");
        return;
    }

    const items = Object.keys(cart)
        .map(item =>
            `${item} x${cart[item].quantity}`
        )
        .join(", ");

    try {

        const response = await fetch(
            "/api/orders",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({

                    user_id: 1,

                    restaurant_id: restaurantId,

                    amount: total,

                    customer_name: customerName,

                    order_type: orderType,

                    table_number:
                        orderType === "Take Away"
                        ? "N/A"
                        : tableNumber,

                    items: items

                })
            }
        );

        const data = await response.json();

        if (data.success) {

            showToast("Order Saved Successfully");

            cart = {};

            renderCart();

            document.getElementById("customerName").value = "";

            setTimeout(() => {

                window.location.href =
                "order-tracking.html";

            }, 1000);

        } else {

            showToast("Failed to save order");
        }

    } catch (err) {

        console.error(err);

        showToast("Server Error");
    }
}

// =====================
// INITIAL LOAD
// =====================

renderCart();
loadRestaurant();

document
    .getElementById("orderType")
    .addEventListener("change", function () {

        const tableDropdown =
            document.getElementById("tableNumber");

        if (this.value === "Take Away") {

            tableDropdown.style.display = "none";

        } else {

            tableDropdown.style.display = "block";
        }
    });