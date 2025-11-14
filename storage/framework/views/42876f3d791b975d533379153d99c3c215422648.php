<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Sign-In Notification</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            color: #e0e7ff;
            margin: 10px 0 0 0;
            font-size: 16px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .info-box {
            background-color: #f9fafb;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 12px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #6b7280;
            font-size: 14px;
        }
        .info-value {
            color: #1f2937;
            font-weight: 500;
            font-size: 14px;
            text-align: right;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-ontime {
            background-color: #d1fae5;
            color: #065f46;
        }
        .status-late {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .location-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }
        .location-inside {
            background-color: #dcfce7;
            color: #166534;
        }
        .location-outside {
            background-color: #fef3c7;
            color: #92400e;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #6b7280;
            font-size: 13px;
            margin: 5px 0;
        }
        .emoji {
            font-size: 24px;
            margin-right: 8px;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            .content {
                padding: 20px;
            }
            .info-row {
                flex-direction: column;
            }
            .info-value {
                text-align: left;
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>📍 PinPoint</h1>
            <p>Attendance Notification</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hello <?php echo e($guardianName); ?>,
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your child <strong><?php echo e($studentName); ?></strong> has signed in to their class.
            </p>

            <!-- Sign-In Details -->
            <div class="info-box">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
                    <span class="emoji">📋</span> Sign-In Details
                </h3>
                
                <div class="info-row">
                    <span class="info-label">Class:</span>
                    <span class="info-value"><?php echo e($className); ?></span>
                </div>

                <div class="info-row">
                    <span class="info-label">Teacher:</span>
                    <span class="info-value"><?php echo e($teacherName); ?></span>
                </div>

                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value"><?php echo e($signInDate); ?></span>
                </div>

                <div class="info-row">
                    <span class="info-label">Time:</span>
                    <span class="info-value"><?php echo e($signInTime); ?></span>
                </div>

                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">
                        <span class="status-badge <?php echo e($status === 'On Time' ? 'status-ontime' : 'status-late'); ?>">
                            <?php echo e($status === 'On Time' ? '✓ On Time' : '⚠ Late'); ?>

                        </span>
                    </span>
                </div>

                <div class="info-row">
                    <span class="info-label">Location:</span>
                    <span class="info-value">
                        <span class="location-badge <?php echo e($isWithinGeofence ? 'location-inside' : 'location-outside'); ?>">
                            <?php echo e($isWithinGeofence ? '✓ Inside Geofence' : '⚠ Outside Geofence'); ?>

                        </span>
                    </span>
                </div>

                <div class="info-row">
                    <span class="info-label">Distance:</span>
                    <span class="info-value"><?php echo e(number_format($distance, 0)); ?> meters</span>
                </div>
            </div>

            <?php if(!$isWithinGeofence): ?>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⚠️ Note:</strong> Your child signed in from outside the designated class location (<?php echo e(number_format($distance, 0)); ?>m away).
                </p>
            </div>
            <?php endif; ?>

            <?php if($status === 'Late'): ?>
            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    <strong>⚠️ Note:</strong> Your child arrived late to this class.
                </p>
            </div>
            <?php endif; ?>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.6;">
                This is an automated notification from PinPoint Attendance System. You're receiving this email because your email address is registered as the guardian contact.
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>PinPoint Attendance System</strong></p>
            <p>Real-time attendance tracking for peace of mind</p>
            <p style="margin-top: 15px;">
                If you have any questions, please contact your school administrator.
            </p>
        </div>
    </div>
</body>
</html>

<?php /**PATH C:\Users\Evren\Documents\GitHub\Thesis-2025\resources\views/emails/student-signin.blade.php ENDPATH**/ ?>