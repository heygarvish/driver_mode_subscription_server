require("dotenv").config()
const { STRIPE_PRIVATE_KEY, STRIPE_PRODUCT_ID } = process.env;

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
    const { customer_email, trial_period_in_days, coupon_id, stripe_price_id } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        success_url: 'https://driver-mode.vercel.app/success',
        cancel_url: 'https://driver-mode.vercel.app/cancel',
        customer_email: customer_email,
        discounts: coupon_id ? [
            {
                coupon: coupon_id,
            },
        ] : [],
        line_items: [
          {
            price: stripe_price_id,
            quantity: 1,
          },
        ],
        subscription_data: trial_period_in_days > 0 ? {
          trial_period_days: trial_period_in_days,
        } : {},
        mode: 'subscription',
      });
    
      res.json(session);
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
})

// app.post("/create-new-price", async (req, res) => {
//     const { amount, product_id } = req.body;

//     try {
//         const price = await stripe.prices.create({
//             unit_amount: amount * 100,
//             currency: "usd",
            // recurring: {
            //     interval: 'year',
            // },
//             product: product_id,
//           });

//         res.send({
//             price_id: price.id,
//             lookup_key: price.lookup_key
//         });
//     } catch (error) {
//         console.error("an error occurred while creating the price:", error);

//         return res.status(500).json({
//             message: error
//         });
//     }
// })

app.post('/migrate-price', async (req, res) => {
    const { newUnitAmount } = req.body;

    try {
        const previousPrices = await stripe.prices.list({
            product: STRIPE_PRODUCT_ID,
            active: true,
            limit: 2, 
        });

        if (previousPrices.data.length > 1) {
            const oldPriceId = previousPrices.data[0].id;
            await stripe.prices.update(oldPriceId, {
                active: false,
            });
        }

        const newPrice = await stripe.prices.create({
            unit_amount: newUnitAmount * 100,
            currency: "usd",
            recurring: {
                interval: 'year',
            },
            product: STRIPE_PRODUCT_ID,
        });

        const subscriptions = await stripe.subscriptions.list({
            status: 'active',
            limit: 10000, 
        });

        for (const subscription of subscriptions.data) {
            const subscriptionItems = subscription.items.data;
            for (const item of subscriptionItems) {
                if (item.price.product === STRIPE_PRODUCT_ID) {
                    await stripe.subscriptions.cancel(subscription.id);
                    break; 
                }
            }
        }

        res.status(200).json({
            price_id: newPrice.id,
            unit_amount: newPrice.unit_amount / 100,
        });
    } catch (error) {
        console.error('Error migrating price:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing request',
            error: error.message,
        });
    }
});

app.post("/create-coupon", async (req, res) => {
    const { percent_off, max_usage } = req.body;

    try {
        const coupon = await stripe.coupons.create({
            percent_off: percent_off,
            max_redemptions: max_usage,
          });

        res.send({
            coupon_id: coupon.id,
        });
    } catch (error) {
        console.error("an error occurred while retrieving the coupon:", error);

        return res.status(500).json({
            message: error
        });
    }
});

// app.post("/get-coupon", async (req, res) => {
//     const { coupon_id } = req.body;

//     try {
//         const coupon = await stripe.coupons.retrieve(
//             coupon_id
//           );

//         res.send({
//             valid: coupon.valid
//         });
//     } catch (error) {
//         console.error("an error occurred while retrieving the coupon:", error);

//         return res.status(500).json({
//             message: error
//         });
//     }
// })

// app.get("/get-all-coupons", async (req, res) => {
//     try {
//         const coupons = await stripe.coupons.list();

//         res.send(coupons);
//     } catch (error) {
//         console.error("an error occurred while retrieving the coupons:", error);

//         return res.status(500).json({
//             message: error
//         });
//     }
// });

app.delete("/delete-coupon", async (req, res) => {
    const { coupon_id } = req.body;

    try {
        await stripe.coupons.del(
            coupon_id
          );

        res.status(200).send();
    } catch (error) {
        console.error("an error occurred while deleting the coupon:", error);

        return res.status(500).json({
            message: error
        });
    }
})

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
