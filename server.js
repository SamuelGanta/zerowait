const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env')
});

const { Pool } = require('pg');
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { OAuth2Client } = require('google-auth-library');

const sampleRestaurants = [
  { id: 1, name: 'Paradise Biryani', cuisine: 'Hyderabadi', address: 'Jubilee Hills, Hyderabad', rating: 4.8, eta: '12-15 min', price: '₹₹' },
  { id: 2, name: 'Shah Ghouse', cuisine: 'Biryani', address: 'Mehdipatnam, Hyderabad', rating: 4.7, eta: '10-12 min', price: '₹₹' },
  { id: 3, name: 'ABs Absolute Barbecues', cuisine: 'BBQ', address: 'HITEC City, Hyderabad', rating: 4.9, eta: '15-18 min', price: '₹₹₹' },
  { id: 4, name: 'Mehfil', cuisine: 'Indian', address: 'Madhapur, Hyderabad', rating: 4.6, eta: '8-10 min', price: '₹₹' },
  { id: 5, name: 'Pista House', cuisine: 'Hyderabadi', address: 'Banjara Hills, Hyderabad', rating: 4.8, eta: '11-14 min', price: '₹₹' },
  { id: 6, name: 'The Biryani House', cuisine: 'Biryani', address: 'Gachibowli, Hyderabad', rating: 4.5, eta: '9-12 min', price: '₹₹' }
];

let memoryOrders = [];
const otpStore = new Map();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
let dbReady = false;

(async () => {
  try {
    await pool.query("SELECT 1");
    dbReady = true;
    console.log("✅ PostgreSQL Connected");
  } catch (err) {
    dbReady = false;
    console.error("❌ PostgreSQL Error:", err);
    console.warn("Falling back to in-memory demo data for restaurant and order flows.");
  }
})();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Home route
app.get("/", (req, res) => {
  res.send("✅ ZeroWait Backend is Running Successfully!");
});

console.log("Serving files from:", __dirname);

const PORT = process.env.PORT || 10000;
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
let twilioClient = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn('Twilio credentials missing. Using local demo OTP flow instead.');
}

function toE164(phone) {
  return phone.startsWith('+') ? phone : `+91${phone}`;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getMenuForRestaurant(name) {
  switch (name) {
    case 'Paradise Biryani':
      return [
        { id: 1, name: 'Chicken Biryani', price: 250 },
        { id: 2, name: 'Mutton Biryani', price: 350 },
        { id: 3, name: 'Family Pack', price: 799 }
      ];
    case 'Shah Ghouse':
      return [
        { id: 1, name: 'Chicken Biryani', price: 240 },
        { id: 2, name: 'Mutton Biryani', price: 340 },
        { id: 3, name: 'Haleem', price: 180 }
      ];
    case 'ABs Absolute Barbecues':
      return [
        { id: 1, name: 'Veg BBQ Platter', price: 499 },
        { id: 2, name: 'Chicken BBQ Platter', price: 699 },
        { id: 3, name: 'Buffet', price: 899 }
      ];
    case 'Mehfil':
      return [
        { id: 1, name: 'Chicken Biryani', price: 220 },
        { id: 2, name: 'Butter Chicken', price: 280 },
        { id: 3, name: 'Naan Basket', price: 120 }
      ];
    case 'Pista House':
      return [
        { id: 1, name: 'Chicken Biryani', price: 260 },
        { id: 2, name: 'Haleem', price: 200 },
        { id: 3, name: 'Double Ka Meetha', price: 150 }
      ];
    default:
      return [
        { id: 1, name: 'Special Dish', price: 299 }
      ];
  }
}

function getFallbackRestaurant(id) {
  const restaurant = sampleRestaurants.find(item => String(item.id) === String(id));
  if (!restaurant) return null;
  return { ...restaurant, menu: getMenuForRestaurant(restaurant.name) };
}

function getFallbackRestaurants() {
  return sampleRestaurants.map(restaurant => ({ ...restaurant, menu: getMenuForRestaurant(restaurant.name) }));
}

async function queryDb(text, params = []) {
  if (!dbReady) {
    throw new Error('DB_UNAVAILABLE');
  }
  return pool.query(text, params);
}

// POST /api/send-otp  { phone }
// POST /api/send-otp
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required"
    });
  }

  try {
    if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
      const verification = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: toE164(phone),
          channel: "sms"
        });

      return res.json({
        success: true,
        status: verification.status
      });
    }

    // Demo OTP
    const otp = generateOtp();
    otpStore.set(phone, { otp });

    console.log(`Demo OTP for ${phone}: ${otp}`);

    return res.json({
      success: true,
      message: "Demo OTP generated"
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// POST /api/verify-otp  { phone, code }
app.post('/api/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and code are required'
    });
  }

  try {
    if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
        const check = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: toE164(phone), code });

      if (check.status === 'approved') {
        await queryDb(`
          INSERT INTO users(phone)
          VALUES($1)
          ON CONFLICT(phone) DO NOTHING
        `, [phone]);
        console.log('USER SAVED:', phone);
        return res.json({ success: true, message: 'OTP verified successfully' });
      }

      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const stored = otpStore.get(phone);
    if (stored && stored.otp === code) {
      otpStore.delete(phone);
      return res.json({ success: true, message: 'OTP verified successfully' });
    }

    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  } catch (err) {
    console.error('FULL ERROR:', err);
    console.error('ERROR MESSAGE:', err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
app.post('/api/auth/google', async (req, res) => {
  try {

    // Accept credential from frontend
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required"
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const {
      sub,
      email,
      name
    } = payload;

    // Check if user exists
    let result = await queryDb(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    let user;

    if (result.rows.length === 0) {

      result = await queryDb(
        `INSERT INTO users (name, email, phone, google_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, email, "GOOGLE_USER", sub]
      );

      user = result.rows[0];

    } else {

      user = result.rows[0];

      await queryDb(
        `UPDATE users
         SET google_id = $1,
             name = $2
         WHERE id = $3`,
        [sub, name, user.id]
      );
    }

    res.json({
      success: true,
      message: "Google login successful",
      user
    });

  } catch (err) {

    console.error("Google Login Error:", err);

    res.status(401).json({
      success: false,
      message: err.message
    });

  }
});
// =============================
// GET SINGLE RESTAURANT + MENU
// =============================

app.get('/api/restaurants', async (req, res) => {
    try {
        const result = await queryDb(
            'SELECT * FROM restaurants ORDER BY rating DESC'
        );

        const restaurants = result.rows.map(restaurant => ({
            ...restaurant,
            menu: getMenuForRestaurant(restaurant.name)
        }));

        res.json(restaurants);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch restaurants'
        });
    }
});

app.get('/api/restaurants/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const restaurantResult = await queryDb(
            'SELECT * FROM restaurants WHERE id = $1',
            [id]
        );

        if (restaurantResult.rows.length === 0) {
            const fallback = getFallbackRestaurant(id);
            if (fallback) {
                return res.json(fallback);
            }
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const restaurant = restaurantResult.rows[0];
        const menu = getMenuForRestaurant(restaurant.name);

        res.json({
            ...restaurant,
            menu
        });

    } catch (err) {

        console.error(err);
        const fallback = getFallbackRestaurant(id);
        if (fallback) {
            return res.json(fallback);
        }

        res.status(500).json({
            success: false,
            message: 'Failed to fetch restaurant details'
        });

    }

});
// =============================
// CREATE ORDER
// =============================

app.post('/api/orders', async (req, res) => {

const {

    user_id,
    restaurant_id,
    amount,
    customer_name,
    order_type,
    table_number,
    items

} = req.body;

try {

    if (!dbReady) {
        const order = {
            id: Date.now(),
            user_id,
            restaurant_id,
            amount,
            customer_name,
            order_type,
            table_number,
            items,
            status: 'Pending',
            created_at: new Date().toISOString()
        };
        memoryOrders.unshift(order);
        return res.json({ success: true, order });
    }
    console.log("Items:", JSON.stringify(items, null, 2));
    const result = await queryDb(
        `
        INSERT INTO orders
        (
            user_id,
            restaurant_id,
            amount,
            customer_name,
            order_type,
            table_number,
            items
        )
        VALUES
        (
            $1,$2,$3,$4,$5,$6,$7
        )
        RETURNING *
        `,
        [
            user_id,
            restaurant_id,
            amount,
            customer_name,
            order_type,
            table_number,
            JSON.stringify(items)
        ]
    );

    res.json({
        success: true,
        order: result.rows[0]
    });

} 
catch (err) {

    console.error("ORDER INSERT ERROR:");
    console.error(err);

    return res.status(500).json({
        success: false,
        message: err.message
    });

}

});

// =============================
// GET LATEST ORDER
// =============================

app.get('/api/latest-order', async (req, res) => {

    try {

        if (!dbReady) {
            const latestOrder = memoryOrders[0];
            if (!latestOrder) {
                return res.json({ status: 'No Orders', queuePosition: 0, waitTime: 0 });
            }
            return res.json({
                id: latestOrder.id,
                amount: latestOrder.amount,
                status: latestOrder.status,
                queuePosition: 1,
                waitTime: 3
            });
        }

        const orderResult = await queryDb(`
    SELECT
        o.*,
        r.name AS restaurant_name
    FROM orders o
    LEFT JOIN restaurants r
        ON o.restaurant_id = r.id
    ORDER BY o.id DESC
    LIMIT 1
`);

        if (orderResult.rows.length === 0) {

            return res.json({
                status: "No Orders",
                queuePosition: 0,
                waitTime: 0
            });

        }

        const latestOrder = orderResult.rows[0];

        let queuePosition = 1;

        try {

        const queueResult = await queryDb(`
        SELECT COUNT(*) AS position
        FROM orders
        WHERE id <= $1
        `, [latestOrder.id]);

        queuePosition =
        Number(queueResult.rows[0].position);

} catch (err) {

    console.log(
        "Queue position calculation failed:",
        err.message
    );

}

res.json({
    id: latestOrder.id,
    restaurant: latestOrder.restaurant_name,
    customer: latestOrder.customer_name,
    orderType: latestOrder.order_type,
    table: latestOrder.table_number,
    items: latestOrder.items,
    amount: latestOrder.amount,
    status: latestOrder.status || "Preparing",
    queuePosition: queuePosition,
    waitTime: queuePosition * 3
});

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch latest order'
        });

    }

});

// =============================
// GET ALL ORDERS (WITH RESTAURANT NAME)
// =============================

app.get('/api/orders', async (req, res) => {

    try {

        if (!dbReady) {
            return res.json(memoryOrders);
        }

        const result = await queryDb(`
            SELECT
                o.id,
                o.user_id,
                o.restaurant_id,
                r.name AS restaurant_name,
                r.address,
                r.cuisine,
                o.amount,
                o.status,
                o.customer_name,
                o.order_type,
                o.table_number,
                o.items
            FROM orders o
            JOIN restaurants r
                ON o.restaurant_id = r.id
            ORDER BY o.id DESC
        `);

        res.json(result.rows);

    } catch (err) {

        console.error(err);
        res.json(memoryOrders);

    }

});

// =============================
// GET ORDERS BY USER
// =============================

app.get('/api/orders/user/:id', async (req, res) => {

    const { id } = req.params;

    try {

        if (!dbReady) {
            return res.json(memoryOrders.filter(order => String(order.user_id) === String(id)));
        }

        const result = await queryDb(
            `
            SELECT
                o.id,
                o.user_id,
                o.restaurant_id,
                r.name AS restaurant_name,
                r.address,
                r.cuisine,
                o.amount,
                o.status,
                o.customer_name,
                o.order_type,
                o.table_number,
                o.items
            FROM orders o
            JOIN restaurants r
                ON o.restaurant_id = r.id
            WHERE o.user_id = $1
            ORDER BY o.id DESC
            `,
            [id]
        );

        res.json(result.rows);

    } catch (err) {

        console.error(err);
        res.json(memoryOrders.filter(order => String(order.user_id) === String(id)));

    }

});
// =============================
// ORDER HISTORY
// =============================

app.get('/api/orders/history', async (req, res) => {

    try {

        const { customer } = req.query;

        if (!customer) {
            return res.status(400).json({
                success: false,
                message: "Customer name is required"
            });
        }

        if (!dbReady) {

            const history = memoryOrders.filter(
                order => order.customer_name === customer
            );

            return res.json(history);

        }

        const result = await queryDb(`
            SELECT
                o.id,
                r.name AS restaurant,
                o.customer_name,
                o.order_type,
                o.table_number,
                o.items,
                o.amount,
                o.status,
                o.created_at
            FROM orders o
            LEFT JOIN restaurants r
                ON o.restaurant_id = r.id
            WHERE o.customer_name = $1
            ORDER BY o.created_at DESC
        `, [customer]);

        res.json(result.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Failed to fetch order history"
        });

    }

});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 ZeroWait OTP Server running on port ${PORT}`);
});