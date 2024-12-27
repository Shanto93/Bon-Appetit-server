const express = require("express");
const app = express();
// const formData = require("form-data");
// const Mailgun = require("mailgun.js");
// const mailgun = new Mailgun(formData);
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
// const mg = mailgun.client({username: 'api', key: 'd4e5c2e7d844553c12f3099b202847b6-777a617d-36aa5fa2'});

//middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const stripe = require("stripe")(
  "sk_test_51PqUUZRvsgXyYSdSZfhP4kJNZBF7agXuSGb0VHOIVautmp73SRcn3OSNzjRGCdMvjc087K0BHUmjdjZZZ9LB1F3A00WlxWMS4P"
);

//Connect MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tuf9wrv.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("bistroBossDB").collection("users");
    const menuCollection = client.db("bistroBossDB").collection("menu");
    const reviewsCollection = client.db("bistroBossDB").collection("reviews");
    const cartsCollection = client.db("bistroBossDB").collection("carts");
    const paymentsCollection = client.db("bistroBossDB").collection("payments");

    //middlewere

    const verifyToken = (req, res, next) => {
      // console.log("Inside verify token: ", req.headers.authorization); // Log all headers

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }

      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    //jwt related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Users related API
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const users = req.body;
      const query = { email: users.email };
      const userExist = await usersCollection.findOne(query);
      if (userExist) {
        return res.send({ message: "User already exists", insertedID: null });
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // admin
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidded Access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // Menu Related API
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await menuCollection.insertOne(data);
      res.send(result);
    });

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: id };
      const updateUser = {
        $set: {
          name: data.name,
          category: data.category,
          image: data.image,
          price: data.price,
          recipe: data.recipe,
        },
      };
      const result = await menuCollection.updateOne(filter, updateUser);
      res.send(result);
    });

    // Review Related API
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const reviewItem = req.body;
      const result = await reviewsCollection.insertOne(reviewItem);
      res.send(result);
    });

    //Cart Related API
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.findOne(query);
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    //Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // app.post("/create-payment-intent", async (req, res) => {
    //   const { price } = req.body;
    //   const amount = parseInt(price * 100);

    //   // Check if amount meets the minimum requirement
    //   if (amount < 50) {
    //     // For USD, minimum is usually 50 cents
    //     return res.status(400).send({
    //       error:
    //         "The amount must be greater than or equal to the minimum charge amount.",
    //     });
    //   }

    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: amount,
    //     currency: "usd",
    //     payment_method_types: ["card"],
    //   });

    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    //Payment Related API
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      // console.log("payment info", payment);

      //delete each item from the cart
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartsCollection.deleteMany(query);

      //Send user email about payment confirmation.
      // mg.messages.create('sandboxe534a870f50f4b30b9aa87a9ddf9f566.mailgun.org', {
      //   from: "Excited User <mailgun@sandbox-123.mailgun.org>",
      //   to: ["shantoislam7363@gmail.com"],
      //   subject: "Payment Confirmation",
      //   text: "Thank You for your payment!",
      //   html: `<h2>Thank you for your order</h2>
      //   <h4>Your Transaction ID is <strong>${payment.transactionId}</strong></h4>
      //   <p>We would like to get your feedback about the food</p>
      //   `
      // })
      // .then(msg => console.log(msg))
      // .catch(err => console.error(err));

      res.send({ paymentResult, deleteResult });
    });

    //Stats for User
    // User-specific stats API
    app.get("/userStats/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      // Check if the requesting user matches the email in the token
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      try {
        // Fetch payments made by the user
        const paymentsQuery = { email: email };
        const payments = await paymentsCollection.find(paymentsQuery).toArray();

        // Count the number of orders
        const ordersCount = payments.length;

        // Calculate total amount spent by the user
        const totalSpent = payments
          .reduce((acc, payment) => acc + payment.price, 0)
          .toFixed(2);

        // Gather any additional stats related to bookings or other user-related collections
        // Example: Fetch user bookings (if you have a bookings collection)

        //getting review
        const reviews = await reviewsCollection.find(paymentsQuery).toArray();
        const totalReviews = reviews.length;

        // Send the response with the aggregated data
        res.send({
          ordersCount,
          totalSpent,
          payments,
          totalReviews,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //Stats or Analytics Related API for admin
    app.get("/adminStats", verifyToken, verifyAdmin, async (req, res) => {
      const customers = await usersCollection.estimatedDocumentCount();
      const products = await cartsCollection.estimatedDocumentCount();
      const orders = await paymentsCollection.estimatedDocumentCount();

      // const payments = await paymentsCollection.find().toArray();
      // const revenue = payments.reduce((total,payment)=>total+payment.price,0);

      // This is the efficient way to see total revenue.Here we need not to load all mongodb data

      const result = await paymentsCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$price",
              },
            },
          },
        ])
        .toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({ customers, products, orders, revenue });
    });

    //Using aggregate pipeline

    app.get("/orderStat", async (req, res) => {
      try {
        const result = await paymentsCollection
          .aggregate([
            {
              $unwind: "$menuItemIds",
            },
            {
              $addFields: {
                menuItemIds: { $toObjectId: "$menuItemIds" },
              },
            },
            {
              $lookup: {
                from: "menu",
                localField: "menuItemIds",
                foreignField: "_id",
                as: "menuItems",
              },
            },
            {
              $unwind: "$menuItems",
            },
            {
              $group: {
                _id: "$menuItems.category",
                quantity: { $sum: 1 },
                revenue: { $sum: "$menuItems.price" },
              },
            },
            {
              $project: {
                _id: 0,
                category: "$_id",
                quantity: "$quantity",
                revenue: "$revenue",
              },
            },
          ])
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching order stats:", error);
        res.status(500).send({ message: "Error fetching order stats" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Bon Appetits is running");
});

app.listen(port, () => {
  console.log(`Bon Appetits id running on port ${port}`);
});
