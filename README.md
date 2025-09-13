# Expense Tracker Application

A full-stack expense tracking application built with React, Node.js, Express, and MySQL. This application helps users track their expenses, view spending patterns, and manage their personal finances effectively. The application is deployed with the frontend on Vercel and backend on Railway.

## 🚀 Live Demo

[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://expense-tracker-liard-nine.vercel.app)

## ✨ Features

- 📊 Interactive dashboard with expense overview and analytics
- 💰 Add and manage expenses with categories
- 📅 Filter and view expenses by month and year
- 📈 Visualize spending with charts and graphs
- 📱 Fully responsive design for all devices
- 🔒 Secure JWT authentication
- 🔄 Real-time data updates

## 🛠️ Tech Stack

### Frontend
- ⚛️ React 18 with Hooks
- 🛣️ React Router v6 for navigation
- 📡 Axios for API communication
- 📊 Chart.js for data visualization
- 💅 Styled Components for styling
- 🔄 React Context API for state management

### Backend
- 🟢 Node.js with Express.js
- 🗄️ MySQL Database
- 🔑 JWT Authentication
- 🌐 RESTful API
- 🔄 CORS enabled for secure cross-origin requests
- 🚀 Deployed on Railway

### Development Tools
- 🧰 NPM for package management
- 🔄 Nodemon for development server
- 🔍 ESLint for code quality
- 💅 Prettier for code formatting

## 🚀 Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher) or yarn
- MySQL Server (v8.0 or higher)
- Git

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ShamindaKanchana/Expense_tracker.git
cd Expense_tracker
```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the backend directory with the following variables:
   ```env
   DB_HOST=your_mysql_host
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=expense_tracker
   JWT_SECRET=your_jwt_secret
   PORT=5000
   NODE_ENV=development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:5000`

### 3. Frontend Setup

1. In a new terminal, navigate to the frontend directory:
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
   The application will open automatically in your default browser at `http://localhost:3000`

## 🚀 Deployment

The application is configured for deployment with:
- Frontend: Vercel
- Backend: Railway (Production URL: [https://expensetracker-production-b2a5.up.railway.app/](https://expensetracker-production-b2a5.up.railway.app/))
- Database: MySQL on Aiven Cloud

### Deploying to Production

1. **Frontend Deployment on Vercel**:
   - Connect your GitHub repository to Vercel
   - Set the build command: `npm run build`
   - Set the output directory: `build`
   - Add environment variables if needed

2. **Backend Deployment on Railway**:
   - Connect your GitHub repository
   - Add the necessary environment variables
   - Set the start script: `npm start`
   - The production API will be available at: [https://expensetracker-production-b2a5.up.railway.app/](https://expensetracker-production-b2a5.up.railway.app/)

### Database Configuration
- The production database is hosted on Aiven Cloud
- Ensure your database connection string and credentials are properly set in the Railway environment variables
- The backend is configured to use the Aiven MySQL database in production

## 📊 Database Schema

The application uses the following main tables:

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Expenses Table
```sql
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255),
  category VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Special thanks to the AI development tools that significantly accelerated the development process, enabling rapid prototyping and efficient problem-solving throughout the project.

### Technologies Used
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)
- [Chart.js](https://www.chartjs.org/)
- [Vercel](https://vercel.com/)
- [Railway](https://railway.app/)
- [Aiven](https://aiven.io/) (Database Hosting)

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


Built with ❤️ by  Shaminda Kanchana