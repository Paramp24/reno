import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load sensitive data from environment variables
EMAIL_ADDRESS =  'parampatel6844@gmail.com'
EMAIL_PASSWORD = 'wjer dsrj xvuq dxme'

def send_email(to_email, subject, body):
    msg = MIMEMultipart()
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        # print("Email sent successfully!")  # Remove or comment out this line
    except Exception as e:
        print(f"Something went wrong: {e}")

def send_verification_email(email, code):
    subject = 'Your Verification Code'
    body = f'Your code is: {code}'
    send_email(email, subject, body)

# Example usage
#send_email("param.patel1@ontariotechu.net", "Test Subject", "Hello, this is a test email.")
