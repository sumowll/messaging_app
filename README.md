# messaging_app

# Backend Structure

backend/
├── config/
│ └── db.js # DynamoDB client setup
├── controllers/
│ ├── authController.js # Login and register logic
│ └── userController.js # Search and friend logic
├── routes/
│ ├── authRoutes.js # /login, /register
│ └── userRoutes.js # /search, /add-friend
├── models/
│ └── userModel.js # Abstracts user DB operations
├── utils/
│ └── hash.js # Password hashing/comparison
├── server.js # Entry point (only app setup)
└── .env
