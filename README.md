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
   
   Update the `.env` file with your database credentials (optional if using Airtable-only):
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=student_portal
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

   Airtable configuration (for using Airtable as the data source):
   ```
   AIRTABLE_API_KEY=your_airtable_personal_access_token
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   AIRTABLE_TABLE_CLASSES=Classes
   AIRTABLE_TABLE_USERS=Users
   # Optional split tables
   AIRTABLE_TABLE_STUDENTS=Students
   AIRTABLE_TABLE_TEACHERS=Teachers
   ```
   
   **Create Airtable Tables:**
   
   **Classes Table** (Required fields):
   - `Class Code` (Single line text)
   - `Class Name` (Single line text)
   - `Date` (Date)
   - `Start Time` (Single line text, e.g., "08:00")
   - `End Time` (Single line text, e.g., "10:00")
   - `Max Students` (Number, integer)
   - `Late Threshold` (Number, integer) - Minutes after start time before student is marked late
   - `Teacher` (Email or Single line text) - Stores the teacher's email who created the class
   - `Enrolled Students` (Link to another record) - **IMPORTANT:** Link to Students table, allow multiple records
   - `isManualControl` (Checkbox, optional)
   - `isOpen` (Checkbox, optional)
   
   **Students Table** (Required fields):
   - `email` (Email or Single line text)
   - `name` (Single line text)
   - `password` (Single line text)
   - `role` (Single line text, set to "student")
   - `age` (Number, integer, optional)
   - `course` (Single line text, optional)
   - `address` (Long text, optional)
   - `guardianName` (Single line text, optional)
   - `relationship` (Single line text, optional)
   - `guardianPhone` (Phone or Single line text, optional)
   
   **Teachers Table** (Required fields):
   - `email` (Email or Single line text)
   - `name` (Single line text)
   - `password` (Single line text)
   - `role` (Single line text, set to "teacher" or "admin")
   - `department` (Single line text, optional)

3. **Generate Application Key:**
   ```bash
   php artisan key:generate
   ```

4. **Start Laravel Server:**
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

### Airtable API Endpoints

**Classes Management:**
- `GET /api/classes?teacherEmail=...` → Returns classes from Airtable `Classes` table (filtered by teacher email)
  - Returns: `{ classes: [{ id, code, name, date, startTime, endTime, maxStudents, lateThreshold, enrolledStudents, ... }] }`
- `POST /api/classes` → Create a new class
  - Body: `{ code, name, date, startTime, endTime, maxStudents, lateThreshold, isManualControl, teacherEmail }`
  - Automatically saves the teacher's email to the `Teacher` field for ownership tracking
- `GET /api/students` → Get all students from Airtable Students table
  - Returns: `{ students: [{ id, name, email, course, age, address }], count }`
- `POST /api/classes/add-students` → Add students to a class
  - Body: `{ "classId": "recXXXXXXXXXXXX", "studentIds": ["recStudentID1", "recStudentID2"] }`
  - Saves student IDs to the `Enrolled Students` field (linked records)
- `POST /api/classes/remove-student` → Remove a student from a class
  - Body: `{ "classId": "recXXXXXXXXXXXX", "studentId": "recStudentID" }`
  - Updates the `Enrolled Students` field
- `POST /api/class/toggle-signin` → Updates `is_signed_in` for a record
  - Body: `{ "record_id": "recXXXXXXXXXXXX", "action": "sign_in" }` or `"sign_out"`

**Authentication:**
- `POST /api/login` → Body: `{ "username": "email", "password": "..." }`
  - Searches Students and Teachers tables
  - Returns user data with role-based information
- `POST /api/register` → Body: `{ email, name, password, password_confirmation, role }`
  - Creates user in Students or Teachers table based on `role`

**Student Profile:**
- `GET /api/student/profile?email=...` → Get student/teacher profile data
- `POST /api/student/profile` → Update profile
  - Body: `{ email, name, age, course, address, guardianName, relationship, guardianPhone }`

If you encounter SSL errors on Windows (cURL error 60):
- Preferred: install a CA bundle (e.g., cacert.pem) and set in `.env`:
  - `AIRTABLE_CA_BUNDLE=C:\\path\\to\\cacert.pem`
- Temporary (dev only): disable verification in `.env`:
  - `AIRTABLE_VERIFY_SSL=false`
  - Then run `php artisan config:clear`.

Notes:
- These Airtable endpoints are public by default to simplify setup for non-technical users. If you need to restrict them, wrap them with Sanctum middleware and add appropriate auth in the frontend.

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
