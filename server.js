require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files from root

// MongoDB Connection (updated without deprecated options)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1); // Exit if DB connection fails
    });

// Message Schema
const messageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subject: { type: String, default: 'No Subject' },
    message: { type: String, required: true, minlength: 3 },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Routes
app.post('/submit-message', async (req, res) => {
    try {
        // Input sanitization (basic example)
        const sanitizeInput = (input) => {
            return typeof input === 'string' 
                ? input.replace(/[<>&'"]/g, '') 
                : input;
        };

        const { name, email, subject, message } = req.body;
        
        // Create new message with sanitized inputs
        const newMessage = new Message({
            name: sanitizeInput(name),
            email: sanitizeInput(email),
            subject: sanitizeInput(subject),
            message: sanitizeInput(message)
        });

        // Save to database
        await newMessage.save();

        // Success response
        res.send(`
            <script>
                alert('Thank you for your message! We have received it successfully.');
                window.location.href = '/contact.html';
            </script>
        `);
    } catch (err) {
        console.error('Error saving message:', err);
        
        // Handle validation errors differently
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).send(`
                <script>
                    alert('Validation error: ${messages.join(', ')}');
                    window.location.href = '/contact.html';
                </script>
            `);
        }

        // Generic error response
        res.status(500).send(`
            <script>
                alert('Server error: Please try again later.');
                window.location.href = '/contact.html';
            </script>
        `);
    }
});

// Optional: Admin route to view messages (protected in production)
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Contact form: http://localhost:${PORT}/contact.html`);
    console.log(`API endpoint: http://localhost:${PORT}/api/messages`);
});

// Error handling for uncaught exceptions
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});