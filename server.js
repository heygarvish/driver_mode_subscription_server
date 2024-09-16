require("dotenv").config()
const { STRIPE_PRIVATE_KEY, STRIPE_PRICE_ID } = process.env;

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000; 

app.use(cors());
app.use(express.json());

const stripe = require("stripe")(STRIPE_PRIVATE_KEY)

app.get("/create-checkout-session", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        line_items: [
          {
            price: STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'subscription',
      });

      console.log("session: ", session.id, session.url, session)
    
      res.json({ url: session.url, session_id: session.id });
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
})

app.get("/stripe-session", async (req, res) => {
    const { stripe_session_id } = req.query;

    try {
        // check session
        const session = await stripe.checkout.sessions.retrieve(stripe_session_id);
        console.log("session: ", session);
  
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
        
      
        // update the user
        res.send({
            "session_id": session.id,
            "subscription_id": session.subscription,
            "customer_id": session.customer,
            "status": session.status === "complete" ? "success" : "failed"
        })
    } catch (error) {
        // handle the error
        console.error("an error occurred while retrieving the stripe session:", error);

        return res.status(500).json({
            message: error
        });
    }
  })

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
