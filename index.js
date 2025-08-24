
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4uzxkby.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// 🔹 Middleware: Verify Firebase ID Token
const verifyFireBaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'unauthorized access' })
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('decoded token', decoded);
    req.decoded = decoded;
    next();
  }
  catch (error) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
}


// // 🔹 Middleware: Ensure email match
// const ensureEmailMatch = (req, res, next) => {
//   const emailFromQuery = req.query.email || req.body.userEmail || req.body.creatorEmail;
//   if (emailFromQuery && emailFromQuery !== req.decoded.email) {
//     return res.status(403).send({ error: true, message: "Forbidden access" });
//   }
//   next();
// };

async function run() {
  try {
    await client.connect();

    const database = client.db("athleticEventsDB");
    const eventsCollection = database.collection("events");
    const bookingsCollection = database.collection("bookings");

    // Public Routes
    app.get("/events", async (req, res) => {
      const result = await eventsCollection.find().toArray();
      res.send(result);
    });

    app.get("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
        if (!result) return res.status(404).send({ message: "Event not found" });
        res.send(result);
      } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Private Routes
    app.post("/events", verifyFireBaseToken, async (req, res) => {
      const newEvent = req.body;
      newEvent.creatorEmail = req.decoded.email;
      const result = await eventsCollection.insertOne(newEvent);
      res.send(result);
    });

    app.put("/events/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const updatedEvent = req.body;
      const filter = { _id: new ObjectId(id), creatorEmail: req.decoded.email };
      const updateDoc = {
        $set: {
          eventName: updatedEvent.eventName,
          eventType: updatedEvent.eventType,
          eventDate: updatedEvent.eventDate,
          description: updatedEvent.description,
          imageUrl: updatedEvent.imageUrl,
          location: updatedEvent.location,
        },
      };
      const result = await eventsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/events/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id), creatorEmail: req.decoded.email };
      const result = await eventsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/myBookings", verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;
       if (email !== req.decoded.email) {
        return res.status(403).message({ message: 'forbidden access' })
      }
      const result = await bookingsCollection.find({ userEmail: email }).toArray();
      res.send(result);
    });

    app.post("/bookings", verifyFireBaseToken, async (req, res) => {
      const booking = req.body;
      booking.userEmail = req.decoded.email;
      const existingBooking = await bookingsCollection.findOne({
        eventId: booking.eventId,
        userEmail: booking.userEmail,
      });
      if (existingBooking) return res.status(409).send({ message: "Already booked" });
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.delete("/bookings/:id", verifyFireBaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id), userEmail: req.decoded.email };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/manageEvents", verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;
       if (email !== req.decoded.email) {
        return res.status(403).message({ message: 'forbidden access' })
      }
      const result = await eventsCollection.find({ creatorEmail: email }).toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ MongoDB connected!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello runners!");
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});