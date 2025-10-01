# Student Portal Login System

A modern, responsive login system for a student portal built with React and Laravel. Features a beautiful dark/purple design with authentication, form validation, and a dashboard.

## Features

- **Modern UI Design**: Dark theme with purple accents matching the provided design
- **Authentication**: Complete login/logout functionality with JWT tokens
- **Form Validation**: Client-side and server-side validation
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dashboard**: User dashboard with role-based information
- **Security**: Password hashing, CORS protection, and secure token storage

## Technology Stack

### Frontend
- React 18
- Axios for API calls
- CSS3 with modern styling
- Inter font family

### Backend
- Laravel 9
- Laravel Sanctum for API authentication
- MySQL database
- CORS configuration

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- PHP (v8.0 or higher)
- Composer
- MySQL

### Backend Setup (Laravel)

1. **Install PHP dependencies:**
   ```bash
   composer install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=student_portal
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

3. **Generate Application Key:**
   ```bash
   php artisan key:generate
   ```

4. **Run Database Migrations:**
   ```bash
   php artisan migrate
   ```

5. **Seed Sample Data:**
   ```bash
   php artisan db:seed
   ```

6. **Start Laravel Server:**
   ```bash
   php artisan serve
   ```
   
   The API will be available at `http://localhost:8000`

### Frontend Setup (React)

1. **Install Node Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm start
   ```
   
   The app will be available at `http://localhost:3000`

## Sample Users

After running the database seeder, you can use these sample accounts:

### Admin User
- **Username:** admin
- **Email:** admin@studentportal.com
- **Password:** password123
- **Role:** admin

### Student User
- **Username:** john_student
- **Email:** john@studentportal.com
- **Password:** password123
- **Role:** student

### Teacher User
- **Username:** jane_teacher
- **Email:** jane@studentportal.com
- **Password:** password123
- **Role:** teacher

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user

### Request/Response Examples

#### Login Request
```json
{
  "username": "admin",
  "password": "password123"
}
```

#### Login Response
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@studentportal.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin"
  },
  "token": "1|..."
}
```

## Project Structure

```
├── public/                 # React public files
├── src/
│   ├── components/         # React components
│   │   ├── LoginPage.js    # Main login component
│   │   ├── LoginPage.css   # Login styling
│   │   ├── Dashboard.js    # Dashboard component
│   │   └── Dashboard.css   # Dashboard styling
│   ├── services/
│   │   └── api.js          # API service layer
│   ├── App.js              # Main App component
│   └── index.js            # React entry point
├── app/
│   ├── Http/Controllers/
│   │   └── AuthController.php
│   └── Models/
│       └── User.php
├── database/
│   ├── migrations/
│   └── seeders/
└── routes/
    └── api.php
```

## Customization

### Styling
- Modify colors in the CSS files
- Update the purple theme (`#8A4FF7`) throughout the application
- Adjust responsive breakpoints as needed

### Authentication
- Add more user roles in the User model
- Implement password reset functionality
- Add email verification

### Dashboard
- Customize dashboard content based on user roles
- Add more features like courses, grades, etc.

## Security Features

- Password hashing with Laravel's Hash facade
- JWT token-based authentication
- CORS protection configured
- Input validation and sanitization
- Secure token storage in localStorage

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
