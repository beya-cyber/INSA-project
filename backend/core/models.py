from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('analyst', 'Analyst'),
        ('partner', 'Partner'),
        ('auditor', 'Auditor'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='analyst')
    badge_id = models.CharField(max_length=50, unique=True, null=True, blank=True)

class Incident(models.Model):
    SEVERITY_CHOICES = (
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    )
    incident_id = models.CharField(max_length=50, unique=True)
    source_channel = models.CharField(max_length=100)
    target_account = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='HIGH')
    risk_score = models.IntegerField()
    status = models.CharField(max_length=30, default='SUSPENDED')
    created_at = models.DateTimeField(auto_now_add=True)

class LegalWarrant(models.Model):
    warrant_id = models.CharField(max_length=50, unique=True)
    target_account = models.CharField(max_length=100)
    institution = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=30, default='PENDING FREEZE')
    issue_date = models.DateField(auto_now_add=True)

class AuditLog(models.Model):
    tx_hash = models.CharField(max_length=100, unique=True)
    action = models.CharField(max_length=100)
    operator = models.CharField(max_length=50)
    target = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
