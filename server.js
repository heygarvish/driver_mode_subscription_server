require("dotenv").config()
const { STRIPE_PRIVATE_KEY, STRIPE_PRICE_ID } = process.env;

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000; 

app.use(cors());
app.use(express.json());

const stripe = require("stripe")(STRIPE_PRIVATE_KEY)

// app.post("/create-customer", async (req, res) => {
//     const { email } = req.body;

//     try {
//         const customer = await stripe.customers.create({
//             email: email,
//           });

//         res.send({
//             customer_id: customer.id
//         });
//     } catch (error) {
//         console.error("an error occurred while creating the customer:", error);

//         return res.status(500).json({
//             message: error
//         });
//     }
// })

app.post("/create-checkout-session", async (req, res) => {
    const { customer_email, allow_trial, coupon_id } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        customer_email: customer_email,
        discounts: coupon_id ? [
            {
                coupon: coupon_id,
            },
        ] : [],
        line_items: [
          {
            price: STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        subscription_data: allow_trial ? {
          trial_period_days: 7,
        } : {},
        mode: 'subscription',
      });
    
      res.json(session);
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
})

app.post("/create-coupon", async (req, res) => {
    const { percent_off } = req.body;

    try {
        const coupon = await stripe.coupons.create({
            percent_off: percent_off,
            max_redemptions: 1,
          });

        res.send(coupon);
    } catch (error) {
        console.error("an error occurred while retrieving the coupon:", error);

        return res.status(500).json({
            message: error
        });
    }
});

app.post("/get-coupon", async (req, res) => {
    const { coupon_id } = req.body;

    try {
        const coupon = await stripe.coupons.retrieve(
            coupon_id
          );

        res.send(coupon);
    } catch (error) {
        console.error("an error occurred while retrieving the coupon:", error);

        return res.status(500).json({
            message: error
        });
    }
})

app.get("/get-all-coupons", async (req, res) => {
    try {
        const coupons = await stripe.coupons.list();

        res.send(coupons);
    } catch (error) {
        console.error("an error occurred while retrieving the coupons:", error);

        return res.status(500).json({
            message: error
        });
    }
});

app.get("/get-stripe-session", async (req, res) => {
    const { stripe_session_id } = req.query;

    try {
        // check session
        const session = await stripe.checkout.sessions.retrieve(stripe_session_id);
  
        // const sessionResult = {
        //   id: 'cs_test_a1lpAti8opdtSIDZQIh9NZ6YhqMMwC0H5wrlwkUEYJc6GXokj2g5WyHkv4',
        //   …
        //   customer: 'cus_PD6t4AmeZrJ8zq',
        //   …
        //   status: 'complete',
        //   …
        //   subscription: 'sub_1OOgfhAikiJrlpwD7EQ5TLea',
        //  …
        // }
        
      
        res.send({
            session_id: session.id,
            customer_id: session.customer,
            status: session.status,
            subscription_id: session.subscription
        });
    } catch (error) {
        // handle the error
        console.error("an error occurred while retrieving the stripe session:", error);

        return res.status(500).json({
            message: error
        });
    }
  })

app.post("/get-subscription", async (req, res) => {
    const { subscription_id } = req.body;

    try {
        const subscription = await stripe.subscriptions.retrieve(
            subscription_id
          );

        res.send(subscription);
    } catch (error) {
        console.error("an error occurred while retrieving the subscription:", error);

        return res.status(500).json({
            message: error
        });
    }
});

app.delete("/cancel-subscription", async (req, res) => {
    const { subscription_id } = req.body;

    try {
        await stripe.subscriptions.cancel(
            subscription_id
          );

        res.status(200).send();
    } catch (error) {
        console.error("an error occurred while canceling the subscription:", error);

        return res.status(500).json({
            message: error
        });
    }
});

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
