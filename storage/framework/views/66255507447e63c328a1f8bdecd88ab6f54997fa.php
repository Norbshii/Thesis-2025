<!DOCTYPE html>
<html lang="<?php echo e(str_replace('_', '-', app()->getLocale())); ?>">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Student Portal</title>
        <style>
            body {
                font-family: 'Nunito', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                color: white;
            }
            .container {
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                padding: 40px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
            }
            h1 {
                font-size: 3rem;
                margin-bottom: 20px;
            }
            p {
                font-size: 1.2rem;
                margin-bottom: 30px;
            }
            .api-link {
                display: inline-block;
                background: #8A4FF7;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                transition: background 0.3s ease;
            }
            .api-link:hover {
                background: #7B3FE8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Student Portal</h1>
            <p>Welcome to the Student Portal API</p>
            <p>Laravel backend is running successfully!</p>
            <a href="/api/login" class="api-link">API Endpoints</a>
        </div>
    </body>
</html>







<?php /**PATH C:\Users\Evren\Documents\GitHub\Thesis-2025\resources\views/welcome.blade.php ENDPATH**/ ?>