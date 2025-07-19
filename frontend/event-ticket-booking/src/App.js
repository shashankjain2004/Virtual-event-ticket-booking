import React, { useState } from 'react';

export default function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFaq, setShowFaq] = useState(false); // FAQ toggle state

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || quantity < 1) {
      setError('Please fill in all fields and select a valid quantity.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create booking
      const bookingRes = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, quantity }),
      });

      const bookingText = await bookingRes.text();
      let bookingData;

      try {
        bookingData = JSON.parse(bookingText);
      } catch {
        throw new Error('Server returned non-JSON response');
      }

      if (!bookingRes.ok) throw new Error('Booking failed');

      // Step 2: Initiate payment
      const paymentRes = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: quantity * 1000, currency: 'INR' }),
      });

      const paymentText = await paymentRes.text();

      let paymentData;
      try {
        paymentData = JSON.parse(paymentText);
      } catch {
        throw new Error('Payment initiation failed: Received HTML instead of JSON');
      }

      if (!paymentRes.ok) throw new Error('Payment initiation failed');

      // Step 3: Load Razorpay SDK
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js ';
      script.async = true;
      script.onload = () => {
        const options = {
          key: 'rzp_test_as8bHSEjGeIrNI',
          amount: paymentData.amount,
          currency: paymentData.currency,
          order_id: paymentData.id,
          name: 'Virtual Tech Summit',
          description: 'Event Ticket Booking',
          handler: async (response) => {
            // Step 4: Confirm payment
            const confirmRes = await fetch('http://localhost:5000/api/payments/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, bookingId: bookingData._id }),
            });

            const confirmText = await confirmRes.text();

            let confirmData;
            try {
              confirmData = JSON.parse(confirmText);
            } catch {
              throw new Error('Payment confirmation failed: Received HTML instead of JSON');
            }

            if (!confirmRes.ok) throw new Error('Payment confirmation failed');

            setBookingId(confirmData.booking._id);
          },
          prefill: { name, email },
          theme: { color: '#3b82f6' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };

      document.body.appendChild(script);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Confirmation Modal
  if (bookingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center transform transition-all animate-fade-in">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">Your ticket has been booked. Thank you for registering.</p>
          <p className="text-sm text-gray-500">Booking ID: <span className="font-semibold">{bookingId}</span></p>
          <button
            onClick={() => setBookingId(null)}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Book Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-700">Virtual Event Booking</h1>
          {/* FAQ Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFaq(!showFaq)}
            className="text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            {showFaq ? 'Close Help' : 'Help'}
          </button>
        </div>
      </header>

      {/* FAQ Section (Toggleable) */}
      {showFaq && (
        <section className="max-w-4xl mx-auto px-6 py-6">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Frequently Asked Questions</h3>

            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-800">1. How do I book a ticket?</h4>
              <p className="text-gray-600 mt-2">Fill in your details and click "Book Ticket" to proceed with payment via Razorpay.</p>
            </div>

            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-800">2. Can I cancel my booking?</h4>
              <p className="text-gray-600 mt-2">Currently, cancellations are not supported. Please contact support for assistance.</p>
            </div>

            <div className="pb-4">
              <h4 className="font-medium text-gray-800">3. Is my payment secure?</h4>
              <p className="text-gray-600 mt-2">Yes! We use Razorpay for secure payments.</p>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Event Info */}
        <section className="bg-white rounded-xl shadow-xl p-8 mb-8 transition hover:shadow-2xl hover:scale-105 duration-300">
          <h2 className="text-3xl font-extrabold text-gray-800 mb-4 text-center md:text-left">Virtual Tech Summit 2025</h2>
          <p className="text-gray-600 mb-6">Join us for an exciting virtual tech summit featuring top industry leaders, live Q&A sessions, and networking opportunities.</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg overflow-hidden shadow-md">
              <img src="https://picsum.photos/400/250 " alt="Event" className="w-full h-auto" />
            </div>
            <div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Date: August 1-3, 2025</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Time: 10:00 AM – 6:00 PM (IST)</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3-1.346-3-3-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5V3m0 18v-2" />
                  </svg>
                  <span>Price: ₹1000 per ticket</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Booking Form */}
        <section className="bg-white rounded-xl shadow-xl p-8 transition hover:shadow-lg duration-300">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Book Your Ticket</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="name" className="block text-gray-700 font-medium">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none transition"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="email" className="block text-gray-700 font-medium">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="quantity" className="block text-gray-700 font-medium">Number of Tickets</label>
              <input
                type="number"
                id="quantity"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                required
              />
            </div>
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition disabled:bg-indigo-400 relative"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Book ${quantity} Ticket(s) - ₹${quantity * 1000}`
                )}
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-indigo-900 text-white py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm opacity-80">
          &copy; {new Date().getFullYear()} Virtual Event Booking. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
