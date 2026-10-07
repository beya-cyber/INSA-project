from rest_framework import serializers
from .models import User, Incident, LegalWarrant, AuditLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'badge_id']

class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = '__all__'

class LegalWarrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalWarrant
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
