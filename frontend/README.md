# Expense Tracker Frontend

This is the frontend for the Expense Tracker application, built with React and React Router.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Frontend Endpoints

### Authentication
- **Login Page**
  - URL: `/login`
  - Method: GET
  - Description: Login page for users to authenticate
  - Authentication: Not required

### Dashboard
- **Dashboard**
  - URL: `/dashboard`
  - Method: GET
  - Description: Main dashboard showing expense overview
  - Authentication: Required

### Expense Management
- **Add New Expense**
  - URL: `/add-expense`
  - Method: GET
  - Description: Form to add a new expense
  - Authentication: Required

- **Monthly Expenses**
  - URL: `/monthly-expenses`
  - Method: GET
  - Description: View and analyze monthly expenses with charts
  - Authentication: Required

## Authentication Flow
1. Unauthenticated users are redirected to `/login`
2. After successful login, users are redirected to `/dashboard`
3. All protected routes will redirect to `/login` if the user is not authenticated

## Backend Setup
This frontend application requires a backend API to function properly. You'll need to set up the backend server before running the frontend.

### Option 1: Using the Provided Backend
1. Navigate to the backend directory
2. Follow the setup instructions in the backend's README
3. Make sure the backend server is running (default: http://localhost:5000)

### Environment Variables
Create a `.env` file in the frontend root directory and add:

```
REACT_APP_API_URL=http://localhost:5000  # Update this if your backend runs on a different port
```

### Note for Development
If you're just testing the frontend without a backend, you can use mock data by uncommenting the mock data sections in the components. Look for comments like `// Simulated data` in the component files.

## Dependencies
- React 18
- React Router DOM
- Chart.js & react-chartjs-2
- Axios (for API calls)

## Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. The application will be available at `http://localhost:3000`

## Testing
Run the test suite with:
```bash
npm test
```

## Building for Production
To create a production build:
```bash
npm run build
```
This will create an optimized production build in the `build` folder.
