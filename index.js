const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4uzxkby.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();

    // Database and Collections
    const database = client.db("athleticEventsDB");
    const eventsCollection = database.collection("events");
    const bookingsCollection = database.collection("bookings");

    // Read all events
    app.get("/events", async (req, res) => {
      const result = await eventsCollection.find().toArray();
      res.send(result);
    });

    // Read a single event by ID
    app.get("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await eventsCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Event not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Create an event (Private route, requires JWT)
    app.post("/events", async (req, res) => {
      const newEvent = req.body;
      const result = await eventsCollection.insertOne(newEvent);
      res.send(result);
    });

    // Update an event (Private route, requires JWT)
    app.put("/events/:id", async (req, res) => {
      const id = req.params.id;
      const updatedEvent = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
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
      const result = await eventsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Delete an event (Private route, requires JWT)
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.deleteOne(query);
      res.send(result);
    });

    // My Bookings & Booking Operations
    // Get all bookings for a specific user (Private route, requires JWT)
    app.get('/myBookings',  async (req, res) => {
      const email = req.query.email;
      // if (req.decoded.email !== email) {
      //   return res.status(403).send({ error: true, message: 'forbidden access' });
      // }
      const query = { userEmail: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // Book an event (Create booking)
    app.post('/bookings',  async (req, res) => {
      const booking = req.body;
      const query = {
        eventId: booking.eventId,
        userEmail: booking.userEmail
      };
      const existingBooking = await bookingsCollection.findOne(query);
      if (existingBooking) {
        return res.status(409).send({ message: 'You have already booked this event.' });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    // Delete a booking (Cancel booking)
    app.delete('/bookings/:id',  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    // Manage Events (for organizers)
    // Get events created by a specific user (Private route, requires JWT)
    app.get("/manageEvents", async (req, res) => {
      const email = req.query.email;
      // if (req.decoded.email !== email) {
      //   return res.status(403).send({ error: true, message: 'forbidden access' });
      // }
      const query = { creatorEmail: email };
      const result = await eventsCollection.find(query).toArray();
      res.send(result);
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
  res.send("Hello runners!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
