// =========================
// ZeroWait Home Page
// =========================

// Welcome User

const userName =
    localStorage.getItem("name") || "Guest";

const welcomeHome =
    document.getElementById("welcomeHome");

if(welcomeHome){
    welcomeHome.innerHTML =
        `👋 Welcome Back, ${userName}`;
}

// Demo Data

if(!localStorage.getItem("totalOrders")){
    localStorage.setItem("totalOrders","18");
}

if(!localStorage.getItem("rewardPoints")){
    localStorage.setItem("rewardPoints","350");
}

if(!localStorage.getItem("walletBalance")){
    localStorage.setItem("walletBalance","1250");
}

if(!localStorage.getItem("moneySaved")){
    localStorage.setItem("moneySaved","2400");
}

if(!localStorage.getItem("tableBookings")){
    localStorage.setItem("tableBookings","12");
}

if(!localStorage.getItem("rideTrips")){
    localStorage.setItem("rideTrips","8");
}

// Order Function

function placeOrder(){

    let totalOrders =
        parseInt(localStorage.getItem("totalOrders")) || 0;

    let rewardPoints =
        parseInt(localStorage.getItem("rewardPoints")) || 0;

    let walletBalance =
        parseInt(localStorage.getItem("walletBalance")) || 0;

    let moneySaved =
        parseInt(localStorage.getItem("moneySaved")) || 0;

    totalOrders += 1;
    rewardPoints += 20;
    walletBalance += 50;
    moneySaved += 100;

    localStorage.setItem(
        "totalOrders",
        totalOrders
    );

    localStorage.setItem(
        "rewardPoints",
        rewardPoints
    );

    localStorage.setItem(
        "walletBalance",
        walletBalance
    );

    localStorage.setItem(
        "moneySaved",
        moneySaved
    );

    alert(
        "✅ Order Placed Successfully!\n\n+1 Order\n+20 Reward Points\n+₹50 Wallet Cashback"
    );
}