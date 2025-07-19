const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const crypto = require('crypto'); // For signature verification

// Load environment variables
require('dotenv').config();

// ✅ Initialize Razorpay instance using .env
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ✅ POST /api/bookings - Create a new booking
router.post('/bookings', async (req, res) => {
  const { name, email, quantity } = req.body;

  if (!name || !email || !quantity || quantity < 1) {
    return res.status(400).json({ message: 'Please provide valid booking details' });
  }

  const amount = quantity * 1000; // ₹1000 per ticket

  try {
    const booking = new Booking({ name, email, quantity, amount });
    await booking.save();
    res.json({ _id: booking._id, amount, currency: 'INR' });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: 'Booking failed', error: err.message });
  }
});

// ✅ GET /api/bookings - Fetch all bookings
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err.message });
  }
});

// ✅ POST /api/payments - Initiate Razorpay payment
router.post('/payments', async (req, res) => {
  const { amount, currency } = req.body;

  if (!amount || !currency) {
    return res.status(400).json({ message: 'Amount and currency are required' });
  }

  try {
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: 'receipt#1',
    };

    const order = await instance.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ message: 'Payment initiation failed', error: err.message });
  }
});

// ✅ POST /api/payments/confirm - Confirm payment
router.post('/payments/confirm', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // ✅ Verify payment signature
    const expectedSignature = crypto
      .createHmac('sha256', instance.key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // ✅ Update booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.paymentId = razorpay_payment_id;
    booking.orderId = razorpay_order_id;
    booking.paymentStatus = 'completed';
    await booking.save();

    res.json({ message: 'Payment confirmed', booking });
  } catch (err) {
    console.error('Payment confirmation error:', err);
    res.status(500).json({ message: 'Payment confirmation failed', error: err.message });
  }
});

// ✅ GET /api/ - Health check or test route
router.get('/', (req, res) => {
  res.send('API is running...');
});

module.exports = router;