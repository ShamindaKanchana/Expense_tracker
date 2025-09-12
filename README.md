# Expense Tracker Application

A full-stack expense tracking application built with React, Node.js, Express, and MySQL. This application helps users track their expenses, view spending patterns, and manage their personal finances effectively.

## Features

- 📊 Dashboard with expense overview
- 💰 Add, edit, and delete expenses
- 📅 Filter expenses by date and category
- 📱 Responsive design for all devices
- 🔐 User authentication (in development)
- 📈 Monthly spending analytics

## Tech Stack

### Frontend
- React.js
- React Router
- Axios for API calls
- Chart.js for data visualization
- Tailwind CSS for styling

### Backend
- Node.js
- Express.js
- MySQL Database
- JWT Authentication
- RESTful API

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MySQL Server (v8.0 or higher)
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ShamindaKanchana/Expense_tracker.git
cd Expense_tracker
```

### 2. Set Up Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```env
   DB_HOST=your_mysql_host
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=expense_tracker
   JWT_SECRET=your_jwt_secret
   PORT=5000
   NODE_ENV=development
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

### 3. Set Up Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Database Schema

The application uses the following main tables:

- `users` - Stores user information
- `expenses` - Tracks all expense entries
- `categories` - Manages expense categories

## API Endpoints

- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add a new expense
- `GET /api/expenses/monthly` - Get monthly expense summary
- `GET /api/expenses/categories` - Get expenses by category
- `GET /api/expenses/recent` - Get recent expenses

## Environment Variables

### Backend
- `PORT` - Server port (default: 5000)
- `DB_*` - Database connection variables
- `JWT_SECRET` - Secret key for JWT authentication
- `NODE_ENV` - Application environment (development/production)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, please contact [Your Name] at [your.email@example.com].

---

Built with ❤️ by [Your Name]